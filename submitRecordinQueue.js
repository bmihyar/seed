 
 /**
 * This function search 'customrecord_queue_rec' for not proccessed records, call submitRecord and then makeItProcessed
 * Version    Date            Author          
 * 1.00       01 Mar 2016     Bashir Mihyar <b.mihyar@******.com>
 */

 
 function submitRecordinQueue() {	 
	 
	try{
		
		var context;
		var queueSearchFilter = new Array();
		queueSearchFilter[0]  = new nlobjSearchFilter('custrecord_queue_rec_processed', null, 'is', 'F');

		var queueSearchColumn  	= new Array();
		queueSearchColumn[0] 	= new nlobjSearchColumn('custrecord_submit_internal_id_rec', null, "group");
		queueSearchColumn[1] 	= new nlobjSearchColumn('custrecord_submit_record_type', null, "group");	
		queueSearchColumn[2] 	= new nlobjSearchColumn('internalid', null, "count");		
        queueSearchColumn[3] 	= new nlobjSearchColumn('formulatext', null, "max").setFormula("NS_CONCAT({internalid})");	
		var recordsToProcess 	= nlapiSearchRecord( 'customrecord_queue_rec', null, queueSearchFilter, queueSearchColumn); //consumes 10 units

		
		for ( var i = 0; recordsToProcess != null && i < recordsToProcess.length; i++ ) {
			var recID 		= recordsToProcess[i].getValue(queueSearchColumn[0]);
			var recTypeNo 	= recordsToProcess[i].getValue(queueSearchColumn[1]);
			//var recTypeNo 	= redcordsToProcess[i].getValue("custrecord_submit_record_type", null, "group");
			var count 		= parseInt(recordsToProcess[i].getValue(queueSearchColumn[2]));
			var internalIDs	= recordsToProcess[i].getValue(queueSearchColumn[3]);
			
		
			nlapiLogExecution('DEBUG', 'submitRecordinQueue' , ' recID: ' + recID + ' recTypeNo: ' + recTypeNo + ' count: ' + count + ' internalIDs: ' + internalIDs);	
			//nlapiLogExecution('DEBUG', 'submitRecordinQueue' , ' recID: ' + recID + ' recTypeNo: ' + recTypeNo + ' count: ' + count);	

			if (submitRecord(recID, recTypeNo) == recID){
				if (count > 1){ // means more than one queue record with this recID value, i need to get records Ids to make them processed.
					var idsArr = internalIDs.split(",");
					for (var duplicateIndex = 0; duplicateIndex < count; duplicateIndex++){
						makeItProcessed(idsArr[duplicateIndex]);						
					}					
				} else {
					makeItProcessed(internalIDs);
				}			

			}//	if (submitRecord(recID, recTypeNo) == recID)
				
			context = nlapiGetContext();	
			if ( context.getRemainingUsage() < 500 || i > 250){// 10,000 - 10 /(36) = 277 records can be processed
				var ScheduleScriptStatus = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
				if ( ScheduleScriptStatus == 'QUEUED' ){
					nlapiLogExecution('DEBUG', 'submitRecordinQueue' , 'Number Of Processed = ' + i +', out of: ' +  recordsToProcess.length );
					break;
				}				
			}
			
		} //for ( var i = 0; recordsToProcess != null && i < recordsToProcess.length; i++ ))
	
	} catch(err) {
		nlapiLogExecution('DEBUG', 'submitRecordinQueue', 'Error: ' + err.name + ' ; ' + err.message );
	}
	
 }//function submitRecordinQueue
 
  /**
 * This function do what is needed from the queue and submit their records each based on its type
 * Version    Date            Author          
 * 1.00       01 Mar 2016     Bashir Mihyar <b.mihyar@******.com>
 */

/**
 * @param {custrecord_submit_internal_id_rec} of the record to be submitted  
 * @param {typeNo} from 'Queue Record type' List
 * @returns {internalid} of the submitted record
 */
 
 function submitRecord(id, typeNo){
    
	var recType = "";
	switch(typeNo) {
		case '1':
		recType = "salesorder";
		break;
		case '2':
		recType = "inventoryitem";		
		break;
		case '3':
		recType = "invoice";
		break;
		case '4':
		recType = "customrecord_campaign_tracking";
		break;
		
	}
	//nlapiLogExecution('DEBUG', 'submitRecord' , ' id: ' + id + ' recType: ' + recType);	
	var rec = nlapiLoadRecord( recType , id); // worst case 10 units
	return nlapiSubmitRecord(rec, true); // worst case 20 units
}//submitRecord

  /**
 * Modify processing status in the queue
 * Version    Date            Author          
 * 1.00       01 Mar 2016     Bashir Mihyar <b.mihyar@******.com>
 */

/**
 * @param {internalid} of the record of the queue record 
 */

function makeItProcessed(record){
	//nlapiLogExecution('DEBUG', 'makeItProcessed' , ' record: ' + record);	
	var loadedRec = nlapiLoadRecord( 'customrecord_queue_rec' , record); // 2 units 
	loadedRec.setFieldValue('custrecord_queue_rec_processed' , 'T' );
	nlapiSubmitRecord(loadedRec , true);    // 4 units
}//makeItProcessed
 