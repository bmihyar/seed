/**************************************************************************************************************************************
*	Function	: ChangeItemsBinLocation
*   Desc		: Upload Transfer Order Items
*   Developer	: Bashir Mihyar (b.mihyar@******.com)
*
*	required script parameter:
*		Type: Integer Number
*		ID:   custscriptcustscript_start_offset
*
*	required Custom record:
*		Type: Transfer Upload Items
*		ID:   customrecord_transfer_upload_items
*		ChangeItemsBinLocation field List:
*			+-----------------------+-----------------------------------+---------------------------+--------------------------------+
*			|	Description			|	ID								|	Type					|	Note						 |
*			+-----------------------+-----------------------------------+---------------------------+--------------------------------+
*			|	upcCode				|	custrecord_blt_upc_code			|	Free-Form Text			|								 |
*			|	Event ID			|	custrecord_blt_event_id			|	Free-Form Text			|								 |
*			|	Processed			|	custrecord_blt_processed		|	Check Box				|								 |
*			|	Processing Date		|	custrecord_blt_processing_date	|	Date/Time				|								 |
*			|	Results				|	custrecord_blt_results			|	Free-Form Text			|								 |
*			|	Original QTY		|	custrecord_blt_orig_qty			|	Integer Number			|								 |
*			|	Error Code			|	custrecord_blt_error_code		|	Integer Number			|								 |
*			+-----------------------+-----------------------------------+---------------------------+--------------------------------+
**************************************************************************************************************************************/
function ChangeItemsBinLocation(){
	var context = nlapiGetContext();
	var ScheduleScriptStatus;
	var todayDate = new Date(), Location;
	var todayStr = nlapiDateToString(todayDate);
	var recordsToProcess = 900;
	var errorCode, TransferRec, TransferSearchResults, record ;
	var ItemRec, LocationId = 0, FromBinId, ToBinId, FromBinAvailQty;
	var queueArray = new Array(); // needed to save item internalids in the queue to be submitted

	
	context.setPercentComplete(0.00);     // set the percent complete parameter to 0.00
    var ItemBinTrfSearchFilters = new Array();
   	ItemBinTrfSearchFilters[0] = new nlobjSearchFilter('custrecord_blt_processed', null, 'is', 'F' );
    var ItemBinTrfSearchColumns = new Array();
	ItemBinTrfSearchColumns[0] = new nlobjSearchColumn('custrecord_bin_location');
	var ItemBinTrfSearchresults = nlapiSearchRecord( 'customrecord_bin_location_transfer', null, ItemBinTrfSearchFilters, ItemBinTrfSearchColumns );
    if (ItemBinTrfSearchresults == null){
   	    nlapiLogExecution('DEBUG', 'Bin Transfer Items', 'No Items to Process' );
		return;
   	}
	Location = ItemBinTrfSearchresults[0].getValue('custrecord_bin_location');
	var filter = new nlobjSearchFilter('name', null, 'is', Location);
	var column  = new nlobjSearchColumn('internalid');
	var result = nlapiSearchRecord('location', null, filter, column);
	if (result != null) {
		LocationId = result[0].getValue('internalid');
	}
	nlapiLogExecution('DEBUG', 'Location:' + Location, 'Location Id = ' +  LocationId);
	

	var LoopSearchFilters = new Array();
	LoopSearchFilters[0] = new nlobjSearchFilter('custrecord_blt_processed', null, 'is', 'F' );
	LoopSearchFilters[1] = new nlobjSearchFilter('custrecord_bin_location', null, 'is', Location );
//	LoopSearchFilters[2] = new nlobjSearchFilter('custrecord_bin_date', null, 'is', todayStr );
	nlapiLogExecution('DEBUG', 'ChangeItemsBinLocation', 'step 2 ' );
	var LoopSearchresults = nlapiSearchRecord( 'customrecord_bin_location_transfer', null, LoopSearchFilters, null );
	nlapiLogExecution('DEBUG', 'ChangeItemsBinLocation', 'step 3 ' );
    if (LoopSearchresults == null){
   	    nlapiLogExecution('DEBUG', 'Bin Transfer Items', 'No Items to Process' );
		return;
   	}
	nlapiLogExecution('DEBUG', 'LoopSearchFilters', 'results length = ' +  LoopSearchFilters.length);

	var TrfRecordFilters = new Array();
	TrfRecordFilters[0] = new nlobjSearchFilter('mainline', null, 'is', 'T' );
	TrfRecordFilters[1] = new nlobjSearchFilter('location', null, 'is', LocationId );
	TrfRecordFilters[2] = new nlobjSearchFilter('trandate', null, 'on', todayDate );
	var TrfSearchColumns  = new Array();
	TrfSearchColumns[0] = new nlobjSearchColumn( 'internalid');
	
	nlapiLogExecution('DEBUG', 'ChangeItemsBinLocation', 'step 3 - 0 - 1 ' );
	var TrfRecordSearchResults = nlapiSearchRecord( 'bintransfer', null, TrfRecordFilters, TrfSearchColumns );
	nlapiLogExecution('DEBUG', 'ChangeItemsBinLocation', 'step 3 - 0 - 0 ' );
    if (TrfRecordSearchResults == null){
		//	need to check if the bin transfer transaction for that location/date already exists
		nlapiLogExecution('DEBUG', 'ChangeItemsBinLocation', 'step 3 -1 ' );
		record = nlapiCreateRecord('bintransfer', {recordmode:'dynamic'});
		record.setFieldValue('location', LocationId); // hard coded
		record.setFieldValue('trandate', todayStr); 
		nlapiLogExecution('DEBUG', 'ChangeItemsBinLocation', 'step 3 -2 ' );
   	}
	else {
		nlapiLogExecution('DEBUG', 'ChangeItemsBinLocation', 'step 3 -3 ' );
		
		record = nlapiLoadRecord('bintransfer', TrfRecordSearchResults[0].getId() );
		nlapiLogExecution('DEBUG', 'ChangeItemsBinLocation', 'step 3 -4 ' );
	
	}
		nlapiLogExecution('DEBUG', 'ChangeItemsBinLocation', 'step 3 -5 ' );
	
	for ( var i = 0 ; i < LoopSearchresults.length ; i++ ){
		if (LoopSearchresults.length <recordsToProcess){ 
			recordsToProcess = LoopSearchresults.length
		}
		errorCode = 0;
		FromBinId = 0; 
		ToBinId = 0;
		nlapiLogExecution('DEBUG', 'ChangeItemsBinLocation', 'step 4 ' );
		var ChangeItemsBinLocationR = nlapiLoadRecord( 'customrecord_bin_location_transfer' , LoopSearchresults[i].getId());
		if ( ChangeItemsBinLocationR.getFieldValue('custrecord_blt_processed')== 'T' ){
			continue;
		}
		var upcCode = ChangeItemsBinLocationR.getFieldValue('custrecord_blt_upc_code') ;
		var FromBin = ChangeItemsBinLocationR.getFieldValue('custrecord_blt_from_bin') ;
		var ToBin = ChangeItemsBinLocationR.getFieldValue('custrecord_blt_to_bin') ;
		var Quantity = ChangeItemsBinLocationR.getFieldValue('custrecord_blt_qty') ;
		if (LocationId == 0 ) {
			BinTrfLogErrorMessage (ChangeItemsBinLocationR, 10, 'Location is wrong', 'T', todayStr);
			continue;
			}
		// check if the From Bin exists
		var filter = new nlobjSearchFilter('binnumber', null, 'is', FromBin);
		var column  = new nlobjSearchColumn('internalid');
		var result = nlapiSearchRecord('bin', null, filter, column);
		if (result != null ) {
			FromBinId = result[0].getId();
		}
		else {
			BinTrfLogErrorMessage (ChangeItemsBinLocationR, 20, 'From BIN does not exist', 'T', todayStr);
			continue;
		}
		// check if the To Bin exists
		var filter = new nlobjSearchFilter('binnumber', null, 'is', ToBin);
		var column  = new nlobjSearchColumn('internalid');
		var result = nlapiSearchRecord('bin', null, filter, column);
		if (result != null ) {
			ToBinId = result[0].getId();
		}
		else {
			BinTrfLogErrorMessage (ChangeItemsBinLocationR, 30, 'To BIN does not exist', 'T', todayStr);
			continue;
		}

		nlapiLogExecution('DEBUG', 'Bin Transfer Items' , ' UPC Code =' +  upcCode + ', From Bin= ' + FromBin + ', To Bin= ' + ToBin + ', QTY= ' + Quantity );
		// Needs Submit - Did the Transfer Order No Change?
		// chcek if the UPC code is valid
		var ItemSearchFilters = new Array();
		ItemSearchFilters[0] = new nlobjSearchFilter('upccode', null, 'is', upcCode );
		var ItemSearchColumns  = new Array();
		ItemSearchColumns[0] = new nlobjSearchColumn( 'internalid');
		var ItemSearchresults = nlapiSearchRecord( 'inventoryitem', null, ItemSearchFilters, ItemSearchColumns );
		if (ItemSearchresults == null){
			BinTrfLogErrorMessage (ChangeItemsBinLocationR, 40, 'Wrong UPC Code number was provided. No match', 'T', todayStr);
			continue;
		}
		var ItemInteralId  = ItemSearchresults[0].getValue('internalid');
		saveItemsInQueueArray(ItemInteralId, queueArray); //bashir

		ItemRec = nlapiLoadRecord('inventoryitem', ItemInteralId);
		nlapiLogExecution('DEBUG', 'Bin Transfer Items - UPC Code', ' Internal ID = ' +  ItemInteralId );
		// check if if the item is linked to the specific bin number
		InvItemsFilters  = new Array();
		InvItemsFilters[0] = new nlobjSearchFilter( 'internalid', null, 'is', ItemInteralId );
		InvItemsFilters[1] = new nlobjSearchFilter( 'inventorylocation', null, 'anyof', [2, 5, 8] ); // 2 -> Dubai, 5 -> Amman, 8 -> Riyadh
		InvItemsFilters[2] = new nlobjSearchFilter( 'binnumber', null, 'is', FromBin ); 
		InvItemsColumns  = new Array();
		InvItemsColumns[0] = new nlobjSearchColumn('binnumber');
		InvItemsColumns[1] = new nlobjSearchColumn('binonhandavail');

		var searchresults = nlapiSearchRecord('inventoryitem', null, InvItemsFilters, InvItemsColumns);	
		if ( searchresults == null) {
			FromBinAvailQty = 0;
			nlapiLogExecution('DEBUG', 'UpdateInventoryItemBINs', 'From Bin ' + FromBin +', search results length is null');
			ItemRec.selectNewLineItem('binnumber');
			ItemRec.setCurrentLineItemValue('binnumber', 'binnumber', FromBinId);
			ItemRec.commitLineItem('binnumber');
			nlapiSubmitRecord( ItemRec , true);
			
		}
		else {
			FromBinAvailQty = searchresults[0].getValue('binonhandavail');
			nlapiLogExecution('DEBUG', 'UpdateInventoryItemBINs', 'From Bin ' + FromBin +', search results length:'+ searchresults.length + ' bin quantity =' + FromBinAvailQty);
		}
		if (Quantity > FromBinAvailQty) {
			Quantity = FromBinAvailQty ;
		}
		if (Quantity <= 0 || FromBinAvailQty <= 0 ){
			BinTrfLogErrorMessage (ChangeItemsBinLocationR, 50, 'Quantity transferred is zero or from bin location available quantity = 0', 'T', todayStr);
			continue;
		}
		// check  if the item is linked to the specific bin number (To Bin numbers)
		InvItemsFilters  = new Array();
		InvItemsFilters[0] = new nlobjSearchFilter( 'internalid', null, 'is', ItemInteralId );
		InvItemsFilters[1] = new nlobjSearchFilter( 'inventorylocation', null, 'anyof', [2, 5, 8] ); // 2 -> Dubai, 5 -> Amman, 8 -> Riyadh
		InvItemsFilters[2] = new nlobjSearchFilter( 'binnumber', null, 'is', ToBin ); 
		InvItemsColumns  = new Array();
		InvItemsColumns[0] = new nlobjSearchColumn('binnumber');
		var searchresults = nlapiSearchRecord('inventoryitem', null, InvItemsFilters, InvItemsColumns);	
		if ( searchresults == null) {
			nlapiLogExecution('DEBUG', 'UpdateInventoryItemBINs', 'To Bin ' + ToBin +', search results length is null');
			ItemRec.selectNewLineItem('binnumber');
			ItemRec.setCurrentLineItemValue('binnumber', 'binnumber', ToBinId);
//					ItemRec.setCurrentLineItemValue('binnumber', 'preferred', 'T');
			ItemRec.commitLineItem('binnumber');
			nlapiSubmitRecord( ItemRec , true);
		}
		else {
			nlapiLogExecution('DEBUG', 'UpdateInventoryItemBINs', 'To Bin ' + ToBin +', search results length:'+ searchresults.length);
		}
		
		record.selectNewLineItem('inventory');
		record.setCurrentLineItemValue('inventory','item', ItemInteralId);
		record.setCurrentLineItemValue('inventory', 'frombins', FromBin);
		record.setCurrentLineItemValue('inventory', 'tobins', ToBin);
		record.setCurrentLineItemValue('inventory', 'quantity', Quantity);
		record.commitLineItem('inventory');
		//	var id = nlapiSubmitRecord(record);
		BinTrfLogErrorMessage (ChangeItemsBinLocationR, 0, '', 'T', todayStr);
		context = nlapiGetContext();
		context.setPercentComplete(Math.round(i*100.0/recordsToProcess));     // set the percent complete parameter to 0.00
		context.getPercentComplete();  // displays percentage complete  	
		if ( context.getRemainingUsage() < 800 || i > 500){
			nlapiSubmitRecord(record);
			saveItemsInQueueRecord(queueArray);
			ScheduleScriptStatus = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
			if ( ScheduleScriptStatus == 'QUEUED' ){
				nlapiLogExecution('DEBUG', 'Bin Transfer Items' , 'Number Of Processed = ' + i +', Search results length =' +  ItemBinTrfSearchresults.length );
				break;
			}
		}
	}
	nlapiSubmitRecord(record);
	saveItemsInQueueRecord(queueArray);
	nlapiLogExecution('DEBUG', 'Bin Transfer Items' , 'Completed Succesfully, processed items = ' + ItemBinTrfSearchresults.length );	
}


function BinTrfLogErrorMessage(ChangeItemsBinLocationR, errorCode, errorMessage, processed, todayStr){
	ChangeItemsBinLocationR.setFieldValue('custrecord_blt_results' , errorMessage);
	ChangeItemsBinLocationR.setFieldValue('custrecord_blt_processing_date' , todayStr );
	ChangeItemsBinLocationR.setFieldValue('custrecord_blt_processed' , processed );
	ChangeItemsBinLocationR.setFieldValue('custrecord_blt_error_code', errorCode);
	nlapiSubmitRecord(ChangeItemsBinLocationR , true);     
}

function saveItemsInQueueArray(itemInternalID, queueArr) {

	if(queueArr.indexOf(itemInternalID) == -1)
		queueArr.push(itemInternalID);

}//function saveItemsInQueue()
function saveItemsInQueueRecord(arr){


	var today = new Date();
	var todayStr = nlapiDateToString(today);
	nlapiLogExecution('DEBUG', 'saveItemsInQueue' , ' Array: ' + arr.toString());
	nlapiLogExecution('DEBUG', 'saveItemsInQueue' , ' today: ' + todayStr);
	if (arr != null && arr.length > 0){
		for (var i = 0; i < arr.length; i++){

			var item = arr[i];
			nlapiLogExecution('DEBUG', 'saveItemsInQueue' , 'item: ' + item);


			var itemSearchFilters 	= new Array();
			itemSearchFilters[0]	= new nlobjSearchFilter('custrecorditm_internal_id', null, 'is', item );
			itemSearchFilters[1]	= new nlobjSearchFilter('custrecord_itm_processed', null, 'is', 'T' );	
			itemSearchFilters[2]	= new nlobjSearchFilter('custrecord_recdate', null, 'on', today );				
			var itemsResultArray 	= nlapiSearchRecord( 'customrecord_items_with_new_bin_status', null, itemSearchFilters, null );
			if (itemsResultArray != null) {
				arr.shift();
				nlapiLogExecution('DEBUG', 'saveItemsInQueue' , ' After Shift: ' + arr.toString());				

			} else { //if (itemsResultArray != null)


				custR = nlapiCreateRecord('customrecord_items_with_new_bin_status');
        		custR.setFieldValue('custrecorditm_internal_id', item);
        		custR.setFieldValue('custrecord_itm_processed', 'F');
        		custR.setFieldValue('custrecord_recdate', todayStr);	
        		custRID = nlapiSubmitRecord(custR, true);
			}

		}// for (var i = 0; i < arr.length; i++)

    
	} else{
		nlapiLogExecution('DEBUG', 'saveItemsInQueue' , 'array is not ready' );
		return;

	}
}
