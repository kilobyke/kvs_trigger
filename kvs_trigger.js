'use strict';
const AWS = require('aws-sdk');
const lambda = new AWS.Lambda();
var docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, callback) => {

    //console.log("Received event from Amazon Connect " + JSON.stringify(event));

    // Function to update the dyamoDB with initial customer information
    updateDynamo(event);

    let payload = "";

    if (event.eventType) {
        payload ={
            inputFileName: "keepWarm.wav",
            connectContactId: "12b87d2b-keepWarm",
            transcriptionEnabled: "false"
        };
    } else {
        payload = {
            streamARN: event.Details.ContactData.MediaStreams.Customer.Audio.StreamARN,
            startFragmentNum: event.Details.ContactData.MediaStreams.Customer.Audio.StartFragmentNumber,
            connectContactId: event.Details.ContactData.ContactId,
            transcriptionEnabled: "false",
            saveCallRecording: "true",
            languageCode: event.Details.ContactData.Attributes.languageCode === "es-US" ? "es-US" : "en-US",
            streamAudioFromCustomer: "true",
            streamAudioToCustomer: "false"
        };
    }

    //console.log("Trigger event passed to transcriberFunction" + JSON.stringify(payload));

    const params = {
        'FunctionName': process.env.transcriptionFunction,
        'InvokeArgs': JSON.stringify(payload)
    };

    lambda.invokeAsync(params, function(err, data) {
        if (err) {
            throw (err);
        } else {
            console.log(JSON.stringify(data));
            if (callback)
                callback(null, buildResponse());
            else
                console.log('nothing to callback so letting it go');
        }
    });

    callback(null, buildResponse());
};

function buildResponse() {
    return {
        // we always return "Success" for now
        lambdaResult:"Success"
    };
}

function updateDynamo(event){
    let customerPhoneNumber = event.Details.ContactData.CustomerEndpoint.Address;
    let contactId = event.Details.ContactData.ContactId;
    process.env.TZ = "America/Denver";
    var tableName = process.env.table_name;
    var currentTimeStamp = new Date().toString();
    var currentDate = new Date().toLocaleDateString();

    var paramsUpdate = {
        TableName: tableName,
        Key: {
            "contactId": contactId
        },

        ExpressionAttributeValues: {
            ":var1": customerPhoneNumber,
            ":var2": currentDate,
            ":var3": currentTimeStamp,
            ":var4": ''
        },

        UpdateExpression: "SET customerPhoneNumber = :var1, callDate = :var2, callTimestamp = :var3, audioFromCustomer = :var4"
    };

    docClient.update(paramsUpdate, function (err, data) {
        if (err) {
            console.log("Unable to update item. Error: ", JSON.stringify(err, null, 2));
        } else console.log("Updated item succeeded!: ", JSON.stringify(data, null, 2));

    });
}
