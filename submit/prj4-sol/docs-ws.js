'use strict';

const axios = require('axios');


function DocsWs(baseUrl) {
  this.docsUrl = `${baseUrl}/docs`;
}

module.exports = DocsWs;

//@TODO add wrappers to call remote web services.

DocsWs.prototype.addDoc = async function( file ) {
  try {
    const response = await axios.post(`${this.docsUrl}`, file);
    return response.data;
  }
  catch (err) {
    console.error(err);
    throw (err.response && err.response.data) ? err.response.data : err;
  }
};
  
DocsWs.prototype.getDoc = async function(id) {
  try {
    const response = await axios.get(`${this.docsUrl}/${id}`);
    return response.data;
  }
  catch (err) {
    console.error(err);
    throw (err.response && err.response.data) ? err.response.data : err;
  }
};


DocsWs.prototype.searchDoc = async function( searchtermurl ) {
  try {
    const response = await axios.get(`${this.docsUrl}/${searchtermurl}`);
    return response.data;
  }
  catch (err) {
    console.error(err);
    throw (err.response && err.response.data) ? err.response.data : err;
  }
};

DocsWs.prototype.returnURL = async function( ) {
  try {
    return this.docsUrl;
  }
  catch (err) {
    console.error(err);
    throw (err.response && err.response.data) ? err.response.data : err;
  }
};

