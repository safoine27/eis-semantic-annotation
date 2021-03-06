/**
 This file contain all the necessary sparql related queries,
 that need to perform.

 @authors : A Q M Saiful Islam, Jaana Takis
 @dependency
 {
    scientificAnnotation.js
    highlight.js
 }
 */

/*global scientificAnnotation :false */


var sparql  = {

    // sparql end points
    SERVER_ADDRESS : "http://localhost:8890/sparql",
    DBPEDIA_SERVER_ADDRESS : "http://dbpedia.org/sparql",

    // annotation properties
    PREFIX_FILE : "http://eis.iai.uni-bonn.de/semann/pdf/",
    PREFIX_PUB : "http://eis.iai.uni-bonn.de/semann/publication/",
    PREFIX_RDFS : "http://www.w3.org/2000/rdf-schema#",
    PREFIX_SEMANN : "http://eis.iai.uni-bonn.de/semann/owl#",
    PREFIX_SEMANNP : "http://eis.iai.uni-bonn.de/semann/property#",

    // For showing similar search result, the maximum size of the list
    SIMILAR_RESULT_LIMIT : 10,

    // For auto complete property and object maximum size of the list
    AUTO_COMPLETE_RESULT_LIMIT : 200,

    /**
     *Read data form sparql table and display
     *
     * @return void
     */
    showDataFromSparql:function (){

        var q = sparql.resource();
        var selectQuery = 'SELECT distinct str(?excerpt) as ?excerpt str(?SUBJECT) as ?SUBJECT str(?PROPERTY) as ?PROPERTY str(?OBJECT) as ?OBJECT FROM  <'+scientificAnnotation.GRAPH_NAME+'> WHERE ' +
            '{ ' +
                q.File + ' '+ q.hasExcerpt + ' ?excerpt . ' +
                '?excerpt ' + q.label + ' ?SUBJECT. ?excerpt ?prop ?obj. ' +
                '?prop ' + q.label + ' ?PROPERTY. ' +
                '?obj ' + q.label + ' ?OBJECT.' +
            '}';

        $.ajax({
            type: "POST",
            url: sparql.SERVER_ADDRESS,
            data: {
                query: selectQuery,
                format: "application/json"
            },
            success: function(response){

                if( response!= null && response.results.bindings.length >0) {
                    progressbar.hideProgressBar();
                    scientificAnnotation.displayAvailableAnnotationFromSparql();
                    var fragments = sparqlResponseParser.parseResponse(response);
                    highlight.rangy_highlight(fragments);
                } else {
                    scientificAnnotation.noAvailableAnnotationFromSparql();
                }
            },
            error: function(jqXHR, exception){
                var errorTxt= messageHandler.getStandardErrorMessage(jqXHR, exception,sparql.SERVER_ADDRESS);
                progressbar.hideProgressBar();
                messageHandler.showErrorMessage(errorTxt);
            }
        });
    },

    /**
     * prepare and send the ajax request for add annotation.
     *
     * @param property
     * @param subject
     * @param object
     * @param textStartPos
     * @param textEndPos
     * @param rangyPage
     * @param rangyFragment
     *
     * @return void
     */
    addAnnotation:function(property, subject, object, textStartPos, textEndPos, rangyPage, rangyFragment){

        var currentPage = $('#pageNumber').val();
        var charStart = textStartPos, charEnd = textEndPos,length = (textEndPos - textStartPos);
	    var fileFragment = '#page='+currentPage+'?char='+charStart+','+charEnd+';length='+length+',UTF-8&rangyPage='+rangyPage+'&rangyFragment='+rangyFragment;
	    var q = sparql.resource(fileFragment);
        var camelProp = sparql.camelCase(property);
        var camelObject = sparql.camelCase(object);

        var insertQuery =
                'prefix semann: <'+sparql.PREFIX_SEMANN+'>' +'\n'+
                'prefix semannp: <'+sparql.PREFIX_SEMANNP+'>'+'\n'+
                'INSERT INTO GRAPH <'+scientificAnnotation.GRAPH_NAME+'> ' +'\n'+
                    '{ ' +'\n'+
                            q.File+' a ' +q.Publication+ '. '+'\n'+
                            q.File+' ' + q.hasExcerpt + ' '+ q.Excerpt +' .'+'\n'+
                            q.Excerpt +' ' + q.label + ' "'+subject+'"@en; ' +'\n'+
                            'semannp:'+camelProp+' semann:'+camelObject+' .'+'\n'+
                            'semannp:'+camelProp+'  ' + q.label + ' "'+property+'"@en. '+'\n'+
                            'semann:'+camelObject+' ' + q.label + ' "'+object+'"@en. '+'\n'+
                '}';

        $.ajax({
            type: "POST",
            url: sparql.SERVER_ADDRESS,
            data: {
                query: insertQuery,
                format: "application/json"
            },
            success: function(response){
                sparql.bindAutoCompleteProperty();
                sparql.bindAutoCompleteObject();
                scientificAnnotation.hideAnnotationDisplayTable();
                progressbar.hideProgressBar();
                messageHandler.showSuccessMessage('Annotation successfully added');
            },
            error: function(jqXHR, exception){
                var errorTxt= messageHandler.getStandardErrorMessage(jqXHR, exception,sparql.SERVER_ADDRESS);
                progressbar.hideProgressBar();
                messageHandler.showErrorMessage(errorTxt);
            }
        });
    },

    /**
     * Provide the data for the auto complete in the property field
     *
     * @param searchItem
     * @returns {Array}
     */
    bindAutoCompleteProperty :function(){

	    var q = sparql.resource();
        var selectQuery = 'SELECT distinct  str(?label) as ?PROPERTY FROM  <'+scientificAnnotation.GRAPH_NAME+'> ' +'\n'+
            ' WHERE ' +'\n'+
            '{ ' +'\n'+
                '?p ' + q.label + ' ?label ' +'\n'+
                'FILTER(regex(STR(?p), "'+sparql.PREFIX_SEMANNP+'","i"))' +'\n'+
            '} ORDER BY fn:lower-case(?label) LIMIT '+sparql.AUTO_COMPLETE_RESULT_LIMIT;

        var source = null;

        $.ajax({
            type: "POST",
            url: sparql.SERVER_ADDRESS,
            data: {
                query: selectQuery,
                format: "application/json"
            },
            success: function(response){
                source = sparqlResponseParser.parseProperty(response);
                scientificAnnotation.setAutoComputeDataForPropertyField(source);
            },
            error: function(jqXHR, exception){
                var errorTxt= messageHandler.getStandardErrorMessage(jqXHR, exception,sparql.SERVER_ADDRESS);
                messageHandler.showErrorMessage(errorTxt);
            }
        });

        return source;
    },


    /**
     * Provide the data for the auto complete in the  object field
     *
     * @param searchItem
     * @returns {Array}
     */
    bindAutoCompleteObject :function(){

	    var q = sparql.resource();
        var selectQuery = 'SELECT distinct  str(?label) as ?OBJECT FROM  <'+scientificAnnotation.GRAPH_NAME+'> ' +'\n'+
            ' WHERE ' +'\n'+
            '{ ' +'\n'+
                '?o ' + q.label + ' ?label ' +'\n'+
                'FILTER(regex(STR(?o), "'+sparql.PREFIX_SEMANN+'","i"))' +'\n'+
            '} ORDER BY fn:lower-case(?label) LIMIT '+sparql.AUTO_COMPLETE_RESULT_LIMIT;

        var source = null;

        $.ajax({
            type: "POST",
            url: sparql.SERVER_ADDRESS,
            data: {
                query: selectQuery,
                format: "application/json"
            },
            success: function(response){
                source = sparqlResponseParser.parseObject(response);
                scientificAnnotation.setAutoComputeDataForObjectField(source);
            },
            error: function(jqXHR, exception){
                var errorTxt= messageHandler.getStandardErrorMessage(jqXHR, exception,sparql.SERVER_ADDRESS);
                messageHandler.showErrorMessage(errorTxt);
            }
        });

        return source;
    },

    /**
     * Provide the data for the auto complete in the property field
     *
     * @param searchItem
     * @returns {Array}
     */
    findSimilarFiles :function(){

	    var q = sparql.resource();
        var selectQuery =
            ' SELECT ?file ' +'\n'+
                ' WHERE ' +'\n'+
                '{' +
                    'SELECT ?file ?s ?p ?o ?curr_o FROM <'+scientificAnnotation.GRAPH_NAME+'> ' +'\n'+
                    ' WHERE ' +'\n'+
                    '{' +'\n'+
                        '{' +'\n'+
                            q.File+' '+q.hasExcerpt+' ?curr_excerpt .' +'\n'+
                            '?curr_excerpt ?curr_prop ?curr_obj.' +'\n'+
                            '?curr_obj ' + q.label + ' ?curr_o.' +'\n'+
                        '}' +'\n'+
                        '{' +'\n'+
                            '?file '+q.hasExcerpt+' ?excerpt .' +'\n'+
                            '?excerpt ' + q.label + ' ?s. ?excerpt ?prop ?obj.' +'\n'+
                            '?prop ' + q.label + ' ?p.' +'\n'+
                            '?obj ' + q.label + ' ?o.' +'\n'+
                        '}' +'\n'+
                        ' FILTER (?obj in (?curr_obj) and !sameTerm('+q.File+', ?file))' +'\n'+
                    '}' +'\n'+
                '}' +'\n'+
                ' GROUP BY ?file ' +'\n'+
                ' ORDER BY DESC(count(?file))  LIMIT '+sparql.SIMILAR_RESULT_LIMIT ;

        var source = null;

        $.ajax({
            type: "POST",
            url: sparql.SERVER_ADDRESS,
            data: {
                query: selectQuery,
                format: "application/json"
            },
            success: function(response){
                source = sparqlResponseParser.parseSimilarSearch(response);
                progressbar.hideProgressBar();
                scientificAnnotation.setSimilarSearchResult(source);
            },
            error: function(jqXHR, exception){
                var errorTxt= messageHandler.getStandardErrorMessage(jqXHR, exception,sparql.SERVER_ADDRESS);
                progressbar.hideProgressBar();
                messageHandler.showErrorMessage(errorTxt);
            }
        });

        return source;
    },

    /**
     * Return the camelCase of a sentences (Hello World --> helloWorld)
     *
     * @param str
     * @returns {XML|string|void|*}
     */
    camelCase :function (str){
        return str.replace(/^.|-| ./g, function(letter, index) {
            return index == 0 ? letter.toLowerCase() : letter.substr(1).toUpperCase();
        });
    },
    
    /**
     * Return the URI of resources to be used in sparql queries.
     *
     * @param optional file fragment location 
     * @returns object with resources you can use in sparql queries.
     */
    resource :function (fragment) {

        var fileURI = sparql.PREFIX_FILE + encodeURI(document.title.toString());
        var excerptURI = fileURI + fragment;
        var hasExcerptURI = sparql.PREFIX_PUB + 'hasExcerpt';

        return {
            File:			'<'+fileURI+'>',
            hasExcerpt:	'<'+hasExcerptURI+'>',
            label:			'<'+sparql.PREFIX_RDFS+'label>',
            Publication:		'<'+sparql.PREFIX_PUB+'Publication>',
            Excerpt:		'<'+excerptURI+'>'
        }
    }
};
