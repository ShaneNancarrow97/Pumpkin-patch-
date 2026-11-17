import test from 'node:test';
import assert from 'node:assert/strict';
import {expansionJournalMarkup,expansionMapMarkup,expansionActivityMarkup} from '../src/ui/village-expansion-pages.js';
const base={id:'mabel:1',name:'A living pattern',type:'puzzle',area:'copse',description:'Follow the moth marks',options:[{id:'Moon',label:'Moon'},{id:'Moth',label:'Moth'}],canAct:true};
test('remote discoveries provide guidance rather than transaction controls',()=>{
 const view=expansionActivityMarkup(base,{nearby:false});assert.match(view.html,/data-vgx-find-activity/);assert.doesNotMatch(view.html,/data-vgx-choice|data-vgx-act=/);
 const local=expansionActivityMarkup(base,{nearby:true});assert.match(local.html,/data-vgx-choice="Moon"/);assert.match(local.html,/data-vgx-solve/);
});
test('a physical light board, unordered ingredients and staged slots expose different real actions',()=>{
 const light=expansionActivityMarkup({...base,puzzleKind:'light-route',components:[{id:'elbow',x:0,y:1,shape:'elbow'}],rotations:{elbow:2}},{nearby:true});assert.match(light.html,/data-vgx-rotate="elbow"/);assert.match(light.html,/180deg/);assert.match(light.html,/data-vgx-submit/);assert.doesNotMatch(light.html,/data-vgx-choice/);
 const flavour=expansionActivityMarkup({...base,puzzleKind:'flavour-set',selected:['Moth']},{nearby:true});assert.match(flavour.html,/aria-pressed="true"/);assert.match(flavour.html,/Try this combination/);
 const stage=expansionActivityMarkup({...base,puzzleKind:'stage-slots',slots:['Entrance','Finale'],assignments:{Entrance:'Moth'}},{nearby:true,slot:'Finale'});assert.match(stage.html,/data-vgx-target-slot="Finale"/);assert.match(stage.html,/Rehearse the scene/);
});
test('map remains inspectable for a locked place and never exposes a teleport action',()=>{
 const html=expansionMapMarkup([{id:'acre',name:'Crooked Acre',level:8,open:false,reason:'Restore the Copse first'}],'green');assert.match(html,/locked/);assert.match(html,/Restore the Copse first/);assert.match(html,/data-vgx-area="acre"/);assert.doesNotMatch(html,/disabled|teleport/);
});
test('chapter previews are read-only, escape labels and identify real next steps',()=>{
 const chapter={id:'a',title:'<script>',area:'copse',status:'active',next:{text:'Find Mabel'},description:'A & B',rewards:[{kind:'blueprint',name:'A new cabinet'}]};const before=JSON.stringify(chapter);const html=expansionJournalMarkup([chapter],'a');assert.match(html,/&lt;script&gt;/);assert.match(html,/Find Mabel/);assert.match(html,/A new cabinet/);assert.equal(JSON.stringify(chapter),before);
});
test('optional neighbour stories are separated from required chapters and cosmetic finales expose equal choices',()=>{
 const html=expansionJournalMarkup([{id:'story',title:'The main story',status:'active'},{id:'friend',title:'A friend’s memory',optional:true,status:'active'}],'friend');assert.match(html,/0 of 1 story chapters/);assert.match(html,/Neighbour stories/);assert.match(html,/Optional friendships/);assert.match(html,/Following/);
 const style=expansionActivityMarkup({...base,type:'reveal',options:[],styleChoices:['Plum','Amber','Moss']},{nearby:true});assert.match(style.html,/data-vgx-style="Plum"/);assert.match(style.html,/same rewards/);
 const locked=expansionActivityMarkup({...base,canAct:false},{nearby:true});assert.doesNotMatch(locked.html,/data-vgx-choice=/);
});
