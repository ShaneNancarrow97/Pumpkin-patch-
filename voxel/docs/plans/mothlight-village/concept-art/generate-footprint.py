#!/usr/bin/env python3
"""Validate plots.json and regenerate its measured SVG; Python standard library only.

These are concept-envelope checks, not a game navmesh, furniture or performance test.
Run from any directory: python3 path/to/generate-footprint.py
"""
from collections import Counter, defaultdict, deque
from html import escape
from itertools import combinations
from math import hypot
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'plots.json'
TARGET = ROOT / 'measured-footprint.svg'
EPS = 1e-8


def rectangle(bounds):
    return (*bounds['min'], *bounds['max'])


def rect_distance(a, b):
    return hypot(max(a[0]-b[2], b[0]-a[2], 0),
                 max(a[1]-b[3], b[1]-a[3], 0))


def point_rect_distance(p, r):
    return hypot(max(r[0]-p[0], p[0]-r[2], 0),
                 max(r[1]-p[1], p[1]-r[3], 0))


def segment_reserve(a, b, half_width):
    # Conservative square caps include corner and junction clearance.
    return (min(a[0],b[0])-half_width, min(a[1],b[1])-half_width,
            max(a[0],b[0])+half_width, max(a[1],b[1])+half_width)


def inside_segment(p, a, b):
    cross = (p[0]-a[0])*(b[1]-a[1])-(p[1]-a[1])*(b[0]-a[0])
    return (abs(cross)<EPS and min(a[0],b[0])-EPS <= p[0] <= max(a[0],b[0])+EPS
            and min(a[1],b[1])-EPS <= p[1] <= max(a[1],b[1])+EPS)


def path_segments(data):
    return [(p,a,b) for p in data['paths'] for a,b in zip(p['points'],p['points'][1:])]


def navigation_graph(data):
    segments = path_segments(data)
    candidates = {tuple(p) for path in data['paths'] for p in path['points']}
    candidates.update(tuple(g['point']) for g in data['gates'])
    candidates.add(tuple(data['arrival']['playerSpawn']))
    # Add perpendicular intersections; collinear overlaps are split at endpoints.
    for (_,a,b),(_,c,d) in combinations(segments,2):
        h, v = (a,b),(c,d)
        if a[0] == b[0] and c[1] == d[1]:
            h,v = (c,d),(a,b)
        if h[0][1] == h[1][1] and v[0][0] == v[1][0]:
            point = (v[0][0],h[0][1])
            if inside_segment(point,*h) and inside_segment(point,*v):
                candidates.add(point)
    graph = defaultdict(set)
    for _,a,b in segments:
        on_segment = sorted((p for p in candidates if inside_segment(p,a,b)),
                            key=lambda p: (p[0]-a[0])**2+(p[1]-a[1])**2)
        for u,v in zip(on_segment,on_segment[1:]):
            graph[u].add(v)
            graph[v].add(u)
    return graph


def reachable(graph, start, blocked):
    seen = {tuple(start)}
    queue = deque(seen)
    while queue:
        point = queue.popleft()
        for neighbour in graph[point]:
            if neighbour not in seen and neighbour not in blocked:
                seen.add(neighbour)
                queue.append(neighbour)
    return seen


def validate(data):
    errors=[]
    bounds=rectangle(data['bounds'])
    plots=data['plots']
    ids=[p['id'] for p in plots]
    if len(ids)!=len(set(ids)):
        errors.append('Duplicate plot IDs')
    if Counter(p['kind'] for p in plots) != {'resident':8,'landmark':1,'reservation':2}:
        errors.append('Expected eight residents, one landmark, two reservations')
    for p in plots:
        r=rectangle(p['bounds'])
        if not (bounds[0] <= r[0]<r[2] <= bounds[2] and bounds[1] <= r[1]<r[3] <= bounds[3]):
            errors.append(f"Plot {p['id']} invalid/outside realm")
        if p['size']!=[r[2]-r[0],r[3]-r[1]]:
            errors.append(f"Plot {p['id']} size disagrees with bounds")
        x,z=p['door']['point']
        face=p['door']['facing']
        valid={'east':x==r[2] and r[1]<z<r[3],
               'west':x==r[0] and r[1]<z<r[3],
               'north':z==r[3] and r[0]<x<r[2],
               'south':z==r[1] and r[0]<x<r[2]}
        if not valid.get(face) or p['door']['minimumClearWidth']<2:
            errors.append(f"Plot {p['id']} invalid door")
        own=[path for path in data['paths'] if path['plotId']==p['id']]
        if len(own)!=1 or own[0]['points'][0]!=[x,z]:
            errors.append(f"Plot {p['id']} missing matching threshold spur")
    for a,b in combinations(plots,2):
        if rect_distance(rectangle(a['bounds']),rectangle(b['bounds']))<EPS:
            errors.append(f"Plots touch/overlap: {a['id']}/{b['id']}")
    for path,a,b in path_segments(data):
        if a==b or (a[0]!=b[0] and a[1]!=b[1]):
            errors.append(f"Invalid orthogonal segment: {path['id']}")
        for point in [a,b]:
            if not (bounds[0]<=point[0]<=bounds[2] and bounds[1]<=point[1]<=bounds[3]):
                errors.append(f"Path {path['id']} point outside realm")
        reserve=segment_reserve(a,b,path['width']/2)
        for plot in plots:
            if path['plotId']==plot['id']:
                # A spur must intentionally meet its own threshold, never another plot.
                continue
            distance=rect_distance(reserve,rectangle(plot['bounds']))
            minimum=data['minimumMainRoadPlotGap'] if path['kind']=='main' else EPS
            if distance+EPS<minimum or distance<EPS:
                errors.append(f"Path {path['id']} lacks clearance from plot {plot['id']}")
    expected={'logs':8,'stone':6,'fibre':6,'herbs':4,'hardwood':4,'moth_silk':2,
              'iron':3,'clay':3,'moonstone':2,'emberbloom':3,'star_amber':1}
    counts=Counter(n['resource'] for n in data['resourceSockets'])
    if counts!=expected or sum(counts.values())!=42:
        errors.append('Resource socket counts disagree with roadmap')
    node_ids=[n['id'] for n in data['resourceSockets']]
    if len(set(node_ids))!=42:
        errors.append('Duplicate resource socket IDs')
    for node in data['resourceSockets']:
        point=node['point']; radius=node['maximumRadius']
        if not (bounds[0]+radius<point[0]<bounds[2]-radius and
                bounds[1]+radius<point[1]<bounds[3]-radius):
            errors.append(f"Node {node['id']} outside realm")
        for plot in plots:
            if point_rect_distance(point,rectangle(plot['bounds']))<=radius+EPS:
                errors.append(f"Node {node['id']} touches plot {plot['id']}")
        for path,a,b in path_segments(data):
            if point_rect_distance(point,segment_reserve(a,b,path['width']/2))<=radius+EPS:
                errors.append(f"Node {node['id']} touches path {path['id']}")
    for a,b in combinations(data['resourceSockets'],2):
        if hypot(a['point'][0]-b['point'][0],a['point'][1]-b['point'][1])<=a['maximumRadius']+b['maximumRadius']+EPS:
            errors.append(f"Resource circles overlap: {a['id']}/{b['id']}")
    marsh=[g for g in data['gates'] if g['id'].startswith('marsh-')]
    if len(marsh)!=2 or len({(g['unlockKey'],g['minimumLevel'],g['storyRequirement']) for g in marsh})!=1:
        errors.append('Both Marsh gates must share one unlock state')
    graph=navigation_graph(data)
    for gate in data['gates']:
        if tuple(gate['point']) not in graph:
            errors.append(f"Gate {gate['id']} is not on path graph")
    # Assumes all chapter prerequisites appropriate to each tested level are met.
    levels={}
    for level in [6,9,12,15,18]:
        blocked={tuple(g['point']) for g in data['gates'] if g['minimumLevel']>level}
        seen=reachable(graph,data['arrival']['playerSpawn'],blocked)
        for plot in plots:
            allowed=plot['minimumLevel']<=level
            connected=tuple(plot['door']['point']) in seen
            if connected!=allowed:
                errors.append(f"Level {level}: plot {plot['id']} reachability={connected}, expected={allowed}")
        levels[str(level)]=[p['id'] for p in plots if tuple(p['door']['point']) in seen]
    # Reaching a late level alone cannot bypass the chapter gates.
    no_chapters=reachable(graph,data['arrival']['playerSpawn'],
                          {tuple(g['point']) for g in data['gates']})
    if {p['id'] for p in plots if tuple(p['door']['point']) in no_chapters}!={'01','02','R1'}:
        errors.append('Closed chapter gates leak into a later district')
    if errors:
        raise ValueError('\n'.join(errors))
    return {'status':'PASS','plots':len(plots),'resources':sum(counts.values()),
            'checks':['plot bounds and separation','main-road minimum 1-unit clearance',
                      'door spurs and thresholds','all 42 nodes against every path and plot',
                      'resource circle separation','shared Marsh unlock',
                      'gated path reachability; chapter gates cannot be bypassed'],
            'reachableDoorsByLevel':levels}


def render(data):
    width,height=1536,1152
    left,top,scale=56,190,8
    map_width,map_height=960,768
    cream='#f8eedb'; gold='#edb768'; muted='#cbbbd0'
    pieces=[f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">
<title id="title">Mothlight Village measured building footprint</title>
<desc id="desc">Proposed 120 by96 unit orthographic greybox. Eight resident plots, observatory, two reserved plots, accessible path spurs and42 fixed resource sockets. Coordinates are defined in plots.json. North is up.</desc>
<defs><pattern id="minor-grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#f7e8cb" stroke-opacity=".07"/></pattern>
<pattern id="reserved" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M-3 3L3-3M0 12L12 0M9 15L15 9" stroke="#bfa6c6" stroke-opacity=".3" stroke-width="1"/></pattern>
<pattern id="bridge" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#825339"/><path d="M0 1H8" stroke="#e5b777" stroke-opacity=".8"/></pattern>
<clipPath id="mapclip"><rect x="{left}" y="{top}" width="{map_width}" height="{map_height}"/></clipPath></defs>
<style>text{{font-family:system-ui,-apple-system,Segoe UI,sans-serif;fill:{cream}}}.muted{{fill:{muted}}}.title{{font-family:Georgia,serif;font-size:36px;letter-spacing:2px}}.small{{font-size:12px}}.tiny{{font-size:11px}}.section{{font-size:18px;font-weight:650;letter-spacing:1px}}</style>
<rect width="1536" height="1152" fill="#211a2b"/>
<rect x="20" y="20" width="1496" height="1112" rx="24" fill="#30243b" stroke="#806783" stroke-opacity=".65"/>
<text class="title" x="56" y="65">MOTHLIGHT VILLAGE</text>
<text x="58" y="95" font-size="16" class="muted">MEASURED BUILDING FOOTPRINT · PROPOSED AUTHORING PLAN</text>
<rect x="56" y="118" width="960" height="42" rx="9" fill="#47364f"/>
<text x="74" y="145" font-size="15">120 × 96 world units · 8 residents + observatory · 2 future plots · 42 resource sockets</text>
<text x="1062" y="68" font-size="14" fill="{gold}">PLAN DATA → SVG</text>
<text x="1062" y="92" class="small muted">Illustrative art is a mood reference.</text>
<text x="1062" y="111" class="small muted">This drawing follows plots.json.</text>
''']
    def xy(point):return left+point[0]*scale,top+(96-point[1])*scale
    def rect(bounds,**attrs):
        x0,z0,x1,z1=rectangle(bounds); x,y=xy((x0,z1))
        at=' '.join(f'{escape(k.replace("_","-"))}="{escape(str(v))}"' for k,v in attrs.items())
        return f'<rect x="{x:g}" y="{y:g}" width="{(x1-x0)*scale:g}" height="{(z1-z0)*scale:g}" {at}/>'
    def text(x,y,value,attrs=''):
        pieces.append(f'<text x="{x:g}" y="{y:g}" {attrs}>{escape(str(value))}</text>')
    pieces.append(f'<g clip-path="url(#mapclip)"><rect x="{left}" y="{top}" width="{map_width}" height="{map_height}" fill="#382e43"/>')
    for district in data['districts']:
        points=' '.join(f'{x:g},{y:g}' for x,y in map(xy,district['polygon']))
        pieces.append(f'<polygon points="{points}" fill="{district["colour"]}" fill-opacity=".65"/>')
    pieces.append(f'<rect x="{left}" y="{top}" width="{map_width}" height="{map_height}" fill="url(#minor-grid)"/>')
    pieces.append(rect(data['bridge']['ravineBounds'],fill='#355a68',fill_opacity='.8'))
    for path in data['paths']:
        if path['kind']!='main':continue
        points=' '.join(f'{x:g},{y:g}' for x,y in map(xy,path['points']))
        pieces.append(f'<polyline points="{points}" fill="none" stroke="#b88753" stroke-width="{path["width"]*scale}" stroke-linejoin="round" stroke-linecap="butt" stroke-opacity=".8"/>')
        pieces.append(f'<polyline points="{points}" fill="none" stroke="#ffe0a4" stroke-width="1" stroke-dasharray="5 6" stroke-opacity=".55"/>')
    pieces.append(rect(data['plaza']['bounds'],fill='#b88753',stroke='#e7bc7e',stroke_opacity='.5',rx=14))
    pieces.append(rect(data['bridge']['bounds'],fill='url(#bridge)',stroke='#eec98a',stroke_width=1.5))
    for path in data['paths']:
        if path['kind']=='main':continue
        points=' '.join(f'{x:g},{y:g}' for x,y in map(xy,path['points']))
        future=path['kind']=='future_spur'
        pieces.append(f'<polyline points="{points}" fill="none" stroke="{muted if future else "#d2a86d"}" stroke-width="{path["width"]*scale}" stroke-opacity="{.38 if future else .76}" stroke-linejoin="round" stroke-linecap="butt"'+(' stroke-dasharray="6 6"' if future else '')+'/>')
    palette={d['id']:d['colour'] for d in data['districts']}
    for plot in data['plots']:
        reservation=plot['kind']=='reservation'
        pieces.append(rect(plot['bounds'],fill='#43334c',stroke='#bfa6c6' if reservation else '#f0c27f',stroke_width=2,stroke_dasharray='7 5' if reservation else 'none',rx=5))
        if reservation:pieces.append(rect(plot['bounds'],fill='url(#reserved)',rx=5))
        r=rectangle(plot['bounds']);cx,cy=xy(((r[0]+r[2])/2,(r[1]+r[3])/2))
        text(cx,cy-16,plot['id'],'text-anchor="middle" font-size="24" font-weight="700"')
        short= 'Reserved' if reservation else plot['occupant'].split()[-1] if plot['id']=='06' else 'Corvus' if plot['id']=='07' else 'Baron' if plot['id']=='08' else plot['occupant'].split()[0]
        text(cx,cy+6,short,'text-anchor="middle" font-size="14"')
        text(cx,cy+25,f'{plot["size"][0]} × {plot["size"][1]}','text-anchor="middle" class="tiny muted"')
        dx,dy=xy(plot['door']['point']);face=plot['door']['facing'];w=plot['door']['minimumClearWidth']*scale
        if face in ['east','west']:pieces.append(f'<path d="M{dx} {dy-w/2}v{w}" stroke="#fff2ca" stroke-width="5"/>')
        else:pieces.append(f'<path d="M{dx-w/2} {dy}h{w}" stroke="#fff2ca" stroke-width="5"/>')
    node_colours={'logs':'#e4b169','stone':'#c6c8d2','fibre':'#d6dfa0','herbs':'#9ce3b5','hardwood':'#c8905c','moth_silk':'#e8ccff','iron':'#87abc8','clay':'#d79272','moonstone':'#b5a4ff','emberbloom':'#ffb06a','star_amber':'#6ee1df'}
    for node in data['resourceSockets']:
        x,y=xy(node['point'])
        pieces.append(f'<circle cx="{x:g}" cy="{y:g}" r="{node["maximumRadius"]*scale}" fill="{node_colours[node["resource"]]}" stroke="#211a2b" stroke-width="1.5"><title>{escape(node["id"])}: {node["point"]}</title></circle>')
    for gate in data['gates']:
        x,y=xy(gate['point']);half=24
        path=f'M{x-half} {y}h{half*2}' if gate['axis']=='horizontal' else f'M{x} {y-half}v{half*2}'
        pieces.append(f'<path d="{path}" stroke="#5e342e" stroke-width="7"/><path d="{path}" stroke="{gold}" stroke-width="3"/>')
        pieces.append(f'<circle cx="{x}" cy="{y}" r="10" fill="#372638" stroke="{gold}"/>')
        text(x,y+4,gate['minimumLevel'],'text-anchor="middle" font-size="10" font-weight="700"')
    for key,label in [('carriageCentre','CARRIAGE'),('playerSpawn','SPAWN')]:
        x,y=xy(data['arrival'][key]);pieces.append(f'<circle cx="{x}" cy="{y}" r="5" fill="#fff2cf"/>');text(x+12,y+4,label,'font-size="9" font-weight="700"')
    x,y=xy(data['arrival']['noticeboard']);pieces.append(f'<rect x="{x-4}" y="{y-5}" width="8" height="10" fill="#f4e2b9" stroke="#3a2b36"/>')
    pieces.append('</g>')
    pieces.append(f'<rect x="{left}" y="{top}" width="{map_width}" height="{map_height}" fill="none" stroke="#b9a2ba" stroke-width="1.5"/>')
    for x in range(0,121,12):
        px,py=xy((x,0));pieces.append(f'<path d="M{px} {py}v7" stroke="#b7a3bd"/>');text(px,py+25,x,'text-anchor="middle" class="small muted"')
    for z in range(0,97,12):
        px,py=xy((0,z));pieces.append(f'<path d="M{px} {py}h-6" stroke="#b7a3bd"/>');text(px-13,py+4,z,'text-anchor="end" class="small muted"')
    text(518,1005,'x → EAST · world units','text-anchor="middle" class="small muted"')
    text(58,177,'z ↑ NORTH','class="small muted"')
    pieces.append('<path d="M992 177v-34m0 0l-6 10m6-10l6 10" stroke="#f3dcab" stroke-width="2" fill="none"/>')
    text(992,135,'N','text-anchor="middle" class="small"')
    # Right-hand key.
    sx=1060
    text(sx,170,'PLOT KEY','class="section"')
    y=204
    for plot in data['plots']:
        pieces.append(f'<rect x="{sx}" y="{y-15}" width="32" height="26" rx="6" fill="#51405a" stroke="#b596bc"/>')
        text(sx+16,y+3,plot['id'],'text-anchor="middle" font-size="13" font-weight="700"')
        text(sx+44,y,plot['occupant'],'font-size="14" font-weight="600"')
        text(sx+44,y+17,plot['building'],'class="small muted"')
        y+=39
    text(sx,666,'DISTRICTS & GATES','class="section"')
    y=696
    for district in data['districts']:
        pieces.append(f'<rect x="{sx}" y="{y-12}" width="14" height="14" rx="3" fill="{district["colour"]}" stroke="#b7a3bd"/>')
        text(sx+25,y,district['name'],'font-size="13"')
        text(sx+310,y,'L'+str(district['minimumLevel']),'font-size="13" font-weight="650"')
        y+=25
    text(sx,841,'42 FIXED RESOURCE SOCKETS','class="section"')
    counts=Counter(n['resource'] for n in data['resourceSockets'])
    for index,(resource,count) in enumerate(counts.items()):
        col=index//6;row=index%6;x=sx+col*210;y=869+row*23
        pieces.append(f'<circle cx="{x+5}" cy="{y-4}" r="5" fill="{node_colours[resource]}" stroke="#211a2b"/>')
        text(x+19,y,f'{resource.replace("_"," ").title()} ×{count}','class="small"')
    text(sx,1023,'Gates also require their story chapter.','class="small muted"')
    text(sx,1043,'Both Marsh gates share one unlock.','class="small muted"')
    text(sx,1063,'Dashed plots/spurs: future reservations.','class="small muted"')
    text(sx,1083,'White marks: level doorway thresholds.','class="small muted"')
    text(58,1045,'6-unit main roads · 4-unit door spurs · 3-unit future spurs · minimum 2-unit clear doors','font-size="14"')
    text(58,1072,'01 = glass conservatory. 05 = Opal’s STONE workshop. 06 = restaurant + upstairs home.','font-size="13"')
    text(58,1098,'Concept envelopes only. Validate terrain, colliders, wheelchair turning and mobile cameras in the game.','class="small muted"')
    pieces.append('</svg>')
    return '\n'.join(pieces)+'\n'


def main():
    data=json.loads(SOURCE.read_text())
    result=validate(data)
    TARGET.write_text(render(data))
    print(json.dumps(result,indent=2))
    print('Wrote '+str(TARGET))


if __name__=='__main__':
    main()
