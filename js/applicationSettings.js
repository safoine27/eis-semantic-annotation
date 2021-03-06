/**
 This file setup the additional information for the application while it load first time.
 @authors : A Q M Saiful Islam
 @dependency
 {
    progressbar.js
    messageHandler.js
 }
 */

/*global $:false, document:false, scientificAnnotation :false, tableAnnotator: false, dataCubeSparql: false,
 progressbar : false, sparql:false, messageHandler:false, plusplus: false  */

/*jslint plusplus: true */
var applicationSettings

applicationSettings  = {

    isUnitTestOngoing : false,

    isLoggingOn : false,

    /**
     * Set up the environment for property and dimensions
     * @return {void}
     */
    setUp: function () {
        applicationSettings.setUpForDimensionProperty();
    },

    /**
     * Setting up the google analytics
     */
    setUpGoogleAnalytics : function() {

        var _gaq = _gaq || [];
        _gaq.push(["_setAccount", "UA-1234-1"]);
        _gaq.push(["_setDomainName", "none"]);
        _gaq.push(["_trackPageview"]);
    },

    /**
     * Check if the dimensions is available in the backend
     * @return {void}
     */
    setUpForDimensionProperty: function () {
        var query =
            'prefix qb: <' + dataCubeSparql.PREFIX_CUBE + '>' + '\n' +
            'prefix semann: <' + dataCubeSparql.PREFIX_SEMANN + '>' + '\n' +
            'ASK ' + '\n' +
            '{' + '\n' +

                'semann:column ?o qb:DimensionProperty.' + '\n' +
                'semann:row ?o qb:DimensionProperty.' + '\n' +
                'semann:value ?o qb:MeasureProperty' + '\n' +

            '}';

        $.ajax({
            type: "POST",
            url: sparql.SERVER_ADDRESS,
            data: {
                query: query,
                format: "application/json"
            },
            success: function (response) {
                applicationSettings.insertDimensionAndProperty(response.boolean);
            },
            error: function (jqXHR, exception) {
                var errorTxt = messageHandler.getStandardErrorMessage(jqXHR, exception, sparql.SERVER_ADDRESS);
                messageHandler.showErrorMessage(errorTxt);
            }
        });
    },

    /**
     * Insert the dimension if they are not available in the backend
     *
     * @param {boolean} isDimensionAvailable
     *
     * @return {void}
     */
    insertDimensionAndProperty: function (isDimensionAvailable) {

        if (isDimensionAvailable === true) {
            return;
        }

        progressbar.showProgressBar('Setting up application set up...');
        var query =
                'prefix qb: <' + dataCubeSparql.PREFIX_CUBE + '>' + '\n' +
                'prefix dct: <' + dataCubeSparql.PREFIX_DCT + '>' + '\n' +
                'prefix rdf: <' + dataCubeSparql.PREFIX_RDF + '>' + '\n' +
                'prefix rdfs: <' + dataCubeSparql.PREFIX_RDFS + '>' + '\n' +
                'prefix xsd: <' + dataCubeSparql.PREFIX_XSD + '>' + '\n' +
                'prefix semann: <' + dataCubeSparql.PREFIX_SEMANN + '>' + '\n' +
                'prefix ex: <' + dataCubeSparql.PREFIX_EX + '>' + '\n' +
                'prefix dcterms: <' + dataCubeSparql.PREFIX_DCTERMS + '>' + '\n' +

                'INSERT IN ' + '<' + scientificAnnotation.GRAPH_NAME_EIS + '> ' + '\n' +
                '{ ' + '\n' +
                    applicationSettings.getDimensionAndProperty() + '\n' +
                '}';

//        console.log(query);
//        return;

        $.ajax({
            type: "POST",
            url: sparql.SERVER_ADDRESS,
            data: {
                query: query,
                format: "application/json"
            },
            success: function (response) {
                progressbar.hideProgressBar();
                messageHandler.showSuccessMessage('Application set up for dimension property success');
            },
            error: function (jqXHR, exception) {
                var errorTxt = messageHandler.getStandardErrorMessage(jqXHR, exception, sparql.SERVER_ADDRESS);
                progressbar.hideProgressBar();
                messageHandler.showErrorMessage(errorTxt);
            }
        });
    },

    /**
     * Get the dimension and properties of the data cube
     * @returns {string}
     */
    getDimensionAndProperty: function () {
        var query =
            'semann:row a rdf:Property, qb:DimensionProperty ;' + '\n' +
            'rdfs:label "row"@en ;' + '\n' +
            'rdfs:comment "a row of a table"@en ;' + '\n' +
            'rdfs:range xsd:nonNegativeInteger .' + '\n' +

            'semann:column a rdf:Property, qb:DimensionProperty ;' + '\n' +
            'rdfs:label "column"@en ;' + '\n' +
            'rdfs:comment "a column of a table"@en ;' + '\n' +
            'rdfs:range xsd:nonNegativeInteger .' + '\n' +

            'semann:value a rdf:Property, qb:MeasureProperty ;' + '\n' +
            'rdfs:label "value"@en ;' + '\n' +
            'rdfs:comment "the value of a table cell"@en ;' + '\n' +
            'rdfs:range rdfs:Literal .' + '\n' +

             'semann:columnHeader a rdf:Property ; ' + '\n' +
             'rdfs:subPropertyOf dcterms:title .';

        return query;
    }
};
