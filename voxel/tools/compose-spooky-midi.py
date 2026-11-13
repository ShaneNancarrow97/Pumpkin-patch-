"""Four original, deterministic MIDI loops. No borrowed tunes or soundfonts."""
from pathlib import Path
import struct
ROOT=Path(__file__).resolve().parents[1]/'assets/music'
PPQ=480

def vlq(n):
    out=[n&127]; n>>=7
    while n: out.insert(0,(n&127)|128); n>>=7
    return bytes(out)
def chunk(events, end):
    data=b''; last=0
    for tick,order,msg in sorted(events):
        data+=vlq(tick-last)+msg;last=tick
    data+=vlq(max(0,end-last))+b'\xff\x2f\x00'
    return b'MTrk'+struct.pack('>I',len(data))+data
def song(slug,title,bpm,root,program,pattern,feel):
    total=32*4*PPQ
    tempo=int(60_000_000/bpm)
    tracks=[chunk([(0,0,b'\xff\x51\x03'+tempo.to_bytes(3,'big')),(0,1,b'\xff\x03'+vlq(len(title))+title.encode())],total)]
    lanes=[[],[],[],[]]
    for ch,prog in [(0,program),(1,38),(2,89)]: lanes[ch].append((0,0,bytes([0xc0+ch,prog])))
    def note(lane,ch,t,n,length,velocity):
        tick=round(t*PPQ);end=round((t+length)*PPQ)
        lanes[lane].append((tick,2,bytes([0x90+ch,n,velocity])))
        lanes[lane].append((end,1,bytes([0x80+ch,n,0])))
    progression=[0,0,5,7,0,8,5,7]
    scale=[0,2,3,5,7,8,10,12]
    for bar in range(32):
        base=root+progression[(bar//2)%8]
        for step,degree in enumerate(pattern):
            if degree is None:continue
            d=(degree+(1 if bar>=16 and step%3==0 else 0))%8
            pitch=root+24+scale[d]+(12 if bar>=24 and step%4==0 else 0)
            note(0,0,bar*4+step*.5,pitch,.33 if feel!='waltz' else .65,64+(step%3)*7)
        for beat in [0,1.5,2,3.5]:note(1,1,bar*4+beat,base,.4,72)
        for degree in [0,3,7]: note(2,2,bar*4+.04,base+12+degree,3.6,32)
        for step in range(8):
            note(3,9,bar*4+step*.5,42,.08,35 if step%2 else 47)
        for beat in [0,2]:note(3,9,bar*4+beat,36,.15,75)
        for beat in [1,3]:note(3,9,bar*4+beat,38,.12,52)
        if bar%8==7:
            for beat in [3,3.25,3.5,3.75]:note(3,9,bar*4+beat,45,.1,50)
    tracks.extend(chunk(lane,total) for lane in lanes)
    data=b'MThd'+struct.pack('>IHHH',6,1,len(tracks),PPQ)+b''.join(tracks)
    (ROOT/(slug+'.mid')).write_bytes(data)
    print(slug,len(data),'bytes')
ROOT.mkdir(parents=True,exist_ok=True)
song('lantern-march','Lantern March',112,45,10,[0,2,4,None,3,2,1,4],'march')
song('skylas-midnight-market','Skylas Midnight Market',124,48,8,[4,2,0,2,6,None,4,3],'funk')
song('moonlit-mischief','Moonlit Mischief',96,50,11,[0,None,4,3,2,None,1,6],'waltz')
song('pumpkin-parade','Pumpkin Parade',132,43,80,[0,4,2,4,3,1,6,4],'dance')
