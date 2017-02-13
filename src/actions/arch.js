import * as types from '../constants/ActionTypes';
import fetch from 'isomorphic-fetch';
import _ from 'lodash';

// 获取表格体数据(table body)，以及表格字段数据(table head)。
const INIT_GRID_URL = '/ficloud_pub_ctr/initgrid';
const SAVE_URL = '/dept/save';
const DELETE_URL = '/dept/delete';
const QUERY_URL = '/dept/query';

// Common helper -> utils.js/api.js
function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response
  } else {
    var error = new Error(response.statusText)
    error.response = response
    throw error
  }
}

function parseJSON(response) {
  return response.json();
}


function requestTableData() {
  return {
    type: types.LOAD_TABLEDATA
  }
}

// 由于后端的数据结构改过几次，所以在这里处理变化后的映射关系。
function receiveTableData(json, itemsPerPage) {
  function fixFieldTypo (fields) {
    return fields.map(field => {
      field.label = field.lable; // API中将label错误的写成了lable
      field.key = field.id; // API后来将key改成了id
      return field;
    });
  }
  return {
    type: types.LOAD_TABLEDATA_SUCCESS,
    data: {
      fields: fixFieldTypo(json.data.head),
      items: json.data.body,
      totalCount: json.totalnum,
      totalPage: Math.ceil(json.totalnum / itemsPerPage)
    }
  }
}

function deleteTableDataSuccess(json) {
  return {
    type: types.DELETE_TABLEDATA_SUCCESS,
    data: json.data
  }
}

// 历史上使用过这个接口，不知道后来这个接口干啥用了。
export function fetchTableData2(itemsPerPage, startIndex, baseDocId) {
  return (dispatch) => {
    dispatch(requestTableData());
    var opts = {
      method: 'post',
      headers: {
        'Content-type': 'application/json'
      },
      mode: "cors",
      body: JSON.stringify({
        doctype: baseDocId
      })
    };

    var url = `${INIT_GRID_URL}?itemsPerPage=${itemsPerPage}`;
    if (typeof startIndex === 'undefined') {
      url += `&startIndex=1`;
    } else {
      url += `&startIndex=${startIndex}`;
    }

    return fetch(url, opts)
      .then(response => {
        return response.json();
      }).then(json => {
        dispatch(receiveTableData(json));
      }).catch(function (err) {
        console.log("fetch error:", err);
      });
  }
}

export function fetchTableData(baseDocId, itemsPerPage, startIndex) {
  return (dispatch) => {
    dispatch(requestTableData());

    var opts = {
      method: 'post',
      headers: {
        'Content-type': 'application/json'
      },
      mode: "cors",
      body: JSON.stringify({
        condition: '',
        begin: startIndex,
        groupnum: itemsPerPage
      })
    };

    var url = `${QUERY_URL}`;
    return fetch(url, opts)
      .then(response => {
        return response.json();
      }).then(json => {
        dispatch(receiveTableData(json, itemsPerPage));
      }).catch(function (err) {
        console.log("fetch error:", err);
      });
  }
}

export function deleteTableData(rowIdx, rowData) {
  return (dispatch, getState) => {
    var id = rowData.id; // 40位主键 primary key
    var opts = {
      method: 'post',
      headers: {
        'Content-type': 'application/json'
      },
      mode: "cors",
      body: JSON.stringify({ id })
    };

    var url = `${DELETE_URL}`;
    return fetch(url, opts)
      .then(response => {
        return response.json();
      }).then(json => {
        alert(`服务器端返回的message: ${json.message}`);
        // TODO(chenyangf@yonyou.com): Should fetch new data
      }).catch(function (err) {
        console.log("delete error:", err);
      });
  }
}

export function saveTableData(rowIdx, rowData) {
  return (dispatch, getState) => {
    var id = rowData.id; // 40位主键 primary key
    var opts = {
      method: 'post',
      headers: {
        'Content-type': 'application/json'
      },
      mode: "cors",
      body: JSON.stringify({
        data: {
          head: {
            id: rowData.id
          }
        }
      })
    };

    var url = `${SAVE_URL}`;
    return fetch(url, opts)
      .then(response => {
        return response.json();
      }).then(json => {
        alert(`服务器端返回的message: ${response.message}`);
        // TODO(chenyangf@yonyou.com): Should fetch new data
      }).catch(function (err) {
        console.log("delete error:", err);
      });
  }
}

/**
 * @param {Object} [rowData] -  Table row data, e.g.
 * {
 *   "cols": [
 *     {},
 *     {}
 *   ]
 * }
 * When "CreateForm" call this, rowData will not pass, so we will try to get 
 * table column(form field) information from table rows.
 */
export function showEditDialog(rowId, rowData) {
  return (dispatch, getState) => {
    if (!rowData) {
      let rowData;
      const state = getState();
      if (state.arch.tableData.length !== 0) {
        rowData = state.arch.tableData[0];
      } else {
        // fake data
        rowData = {};
        rowData.cols = [
          { type: 'text', label: 'col1', value: '' },
          { type: 'text', label: 'col2', value: '' }
        ];
      }
      dispatch({
        type: types.SHOW_EDIT_DIALOG,
        openDialog: true,
        formData: rowData.cols
      })
    } else {
      dispatch({
        type: types.SHOW_EDIT_DIALOG,
        openDialog: true,
        formData: rowData.cols
      })
    }

  };
}

export function hideEditDialog() {
  return (dispatch, getState) => {
    dispatch({
      type: types.HIDE_EDIT_DIALOG,
      openDialog: false,
      formData: []
    })
  };
}

export function updateEditFormFieldValue(label, value) {
  return (dispatch, getState) => {
    const { arch: { editFormData } } = getState();
    const id = _.findIndex(editFormData, field => field.label === label);
    if (id === -1) {
      console.log('Not found this field:', label, ', in editFormData:', editFormData);
      return false;
    }
    // TODO(chenyangf@yonyou.com): Dont touch state when value not changed.
    dispatch({
      type: types.UPDATE_EDIT_FORM_FIELD_VALUE,
      id,
      payload: value
    });
  };
};

export function initEditFormData(editFormData) {
  return dispatch => {
    dispatch({
      type: types.INIT_EDIT_FORM_DATA,
      editFormData
    });
  };
};

export function submitEditForm() {
  return (dispatch, getState) => {
    dispatch({
      type: types.SUBMIT_EDIT_FORM
    });
    const processResult = result => {
      result.error ?
        dispatch({
          type: types.SUBMIT_EDIT_FORM_FAIL,
          bsStyle: 'danger',
          message: result.error.message
        })
      :
        dispatch({
          type: types.SUBMIT_EDIT_FORM_SUCCESS,
          bsStyle: 'success',
          message: '提交成功'
        })
    };
    const { arch: { editFormData } } = getState();
    const idField = editFormData.find(field => field.label === 'id');
    const options = {
      method: 'put',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(editFormData)
    };
    return fetch(`/api/arch/${idField.value}`, options)
      .then(checkStatus)
      .then(parseJSON)
      .then(processResult)
      .catch(error => {
        dispatch({
          type: types.SUBMIT_EDIT_FORM_FAIL,
          bsStyle: 'danger',
          message: error.message
        });
        throw error;
      });
  };
};

// create dialog

/**
 * @param {Object} [rowData] -  Table row data, e.g.
 * {
 *   "cols": [
 *     {},
 *     {}
 *   ]
 * }
 * When "CreateForm" call this, rowData will not pass, so we will try to get 
 * table column(form field) information from table rows.
 */
export function showCreateDialog(rowId, rowData) {
  return (dispatch, getState) => {
    if (!rowData) {
      let rowData;
      const state = getState();
      if (state.arch.tableData.length !== 0) {
        rowData = state.arch.tableData[0];
      } else {
        // fake data
        rowData = {};
        rowData.cols = [
          { type: 'text', label: 'col1', value: '' },
          { type: 'text', label: 'col2', value: '' }
        ];
      }
      dispatch({
        type: types.SHOW_CREATE_DIALOG,
        openDialog: true,
        formData: rowData.cols
      })
    } else {
      dispatch({
        type: types.SHOW_CREATE_DIALOG,
        openDialog: true,
        formData: rowData.cols
      })
    }

  };
}

export function hideCreateDialog() {
  return (dispatch, getState) => {
    dispatch({
      type: types.HIDE_CREATE_DIALOG,
      openDialog: false,
      formData: []
    })
  };
}

export function submitCreateForm() {
  return (dispatch, getState) => {
    dispatch({
      type: types.SUBMIT_CREATE_FORM
    });
    const processResult = result => {
      result.error ?
        dispatch({
          type: types.SUBMIT_CREATE_FORM_FAIL,
          bsStyle: 'danger',
          message: result.error.message
        })
      :
        dispatch({
          type: types.SUBMIT_CREATE_FORM_SUCCESS,
          bsStyle: 'success',
          message: '提交成功'
        })
    };
    const { arch: { createFormData } } = getState();
    const options = {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createFormData)
    };
    return fetch(`/api/arch`, options)
      .then(checkStatus)
      .then(parseJSON)
      .then(processResult)
      .catch(error => {
        dispatch({
          type: types.SUBMIT_CREATE_FORM_FAIL,
          bsStyle: 'danger',
          message: error.message
        });
        throw error;
      });
  };
};

export function initCreateFormData(formData) {
  return dispatch => {
    dispatch({
      type: types.INIT_CREATE_FORM_DATA,
      formData
    });
  };
};

export function updateCreateFormFieldValue(label, value) {
  return (dispatch, getState) => {
    const { arch: { fields } } = getState();
    const id = _.findIndex(fields, field => field.label === label);
    if (id === -1) {
      console.log('Not found this field:', label, ', in fields:', fields);
      return false;
    }
    // TODO(chenyangf@yonyou.com): Dont touch state when value not changed.
    dispatch({
      type: types.UPDATE_CREATE_FORM_FIELD_VALUE,
      id,
      payload: value
    });
  };
};

export function showAdminAlert() {
  return dispatch => {
    dispatch({
      type: types.SHOW_ADMIN_ALERT
    });
  };
};

export function hideAdminAlert() {
  return dispatch => {
    dispatch({
      type: types.HIDE_ADMIN_ALERT
    });
  };
};
