
const STATUSES = {
Waiting:     {color:'var(--s-waiting)',     bg:'var(--s-waiting-bg)'},
Exam:        {color:'var(--s-exam)',        bg:'var(--s-exam-bg)'},
Diagnostics: {color:'var(--s-diagnostics)', bg:'var(--s-diagnostics-bg)'},
Ultrasound:  {color:'var(--s-ultrasound)',  bg:'var(--s-ultrasound-bg)'},
Procedure:   {color:'var(--s-procedure)',   bg:'var(--s-procedure-bg)'},
Admitted:    {color:'var(--s-admitted)',    bg:'var(--s-admitted-bg)'},
Discharged:  {color:'var(--s-discharged)',  bg:'var(--s-discharged-bg)'},
Euthanized:  {color:'#8A82A8',              bg:'rgba(138,130,168,.16)'},
Hospitalized:{color:'#2FB6B9',              bg:'rgba(47,182,185,.16)'}
};
const FLOW_COLS = ['Waiting','Exam','Diagnostics','Ultrasound','Procedure'];
const STAGE_ORDER = ['Waiting','Exam','Diagnostics','Ultrasound','Procedure','Admitted','Discharged'];

const ROOMS = (window.Pravix && Pravix.getRooms) ? Pravix.getRooms() : ['Lobby','Room 1','Room 2','Room 3','Room 4','Room 5','Room 6','Room 7','Comfort Room'];
const ROOM_SPEC = (window.Pravix && Pravix.getRoomSpec) ? Pravix.getRoomSpec() : {'Room 2':'Oncology','Room 4':'Neurology','Comfort Room':'End-of-life'};
