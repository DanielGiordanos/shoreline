
/* opsAction · its layers, innermost first: 1 #54 wrap   (PVX-N387; kept true by flow_t387) */
function opsAction(op){ return pvxRun('opsAction',opsAction$base,this,arguments); }
function opsAction$base(op){
opsMenuClose();
if(op==='new') setTimeout(openAddPatient,120);
else if(op==='shift') setTimeout(openShiftSetup,120);
else if(op==='alert') setTimeout(openAlertModal,120);
else if(op==='print') setTimeout(function(){ if(window.pvxPrintView) pvxPrintView(); },160);
}
