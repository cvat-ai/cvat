/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* global
    showMessage:false
    DashboardView:false
*/

//CF Entrypoint

window.addEventListener('dashboardReady', () => {
  	const createWorkstreamApiInputTextId = 'cfCreateApiInputText';
	const createWorkstreamIdInputTextId = 'cfCreateWsIdInputText';

		
    // Setup the "CF API key and Workstream ID" dialog
    const title1 = 'Field for your CloudFactory Workstreams API Key.';
    const placeh1 = 'api_key_goes_here';
    const title2 = 'Field for your 20 char CloudFactory Workstreams ID.';
    const placeh2 = 'workstream_id_goes_here';

    $(`
        <tr>
            <td> <label class="regular h2"> CloudFactory API Key: </label> </td>
            <td>
                <input type="text" id="${createWorkstreamApiInputTextId}" class="regular" style="width: 90%", placeholder="${placeh1}" title="${title1}"/>
            </td>
        </tr>
        <tr>
            <td> <label class="regular h2"> CF Workstream ID: </label> </td>
            <td>
                <input type="text" id="${createWorkstreamIdInputTextId}" class="regular" style="width: 90%", placeholder="${placeh2}" title="${title2}"/>
            </td>
        </tr>
        `).insertAfter($('#gitLFSCheckbox').parent().parent());


    const cfapi = $(`#${createWorkstreamApiInputTextId}`).prop('value');
    const cfwsid = $(`#${createWorkstreamIdInputTextId}`).prop('value');
});
