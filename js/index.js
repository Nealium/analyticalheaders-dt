/**
 * AnalyticHeaders Datatables extension
 * @module AnalyticalHeaders
 * @author Neal Joslin <neal@joslin.io>
 */
//@ts-check
import DataTable from "datatables.net-dt";
import AnalyticalHeaders from "./AnalyticalHeaders";

/**
 * calculate the average of a column
 * @param {(((raw: string|number) => string|null)|null)} [parser=null] -
 *   parser function for encoded values
 * @returns {[number, number]} average and count
 */
function _average(parser = null) {
  const data = this.flatten();

  const sum = data.reduce((/** @type string **/ a, /** @type string **/ b) => {
    // normalize
    let _a;
    let _b;

    if (parser !== null) {
      _a = parser(a);
      _b = parser(b);
    } else {
      _a = a !== null ? a.toString() : "";
      _b = b !== null ? b.toString() : "";
    }

    // transform into number
    let casted_a = parseFloat(_a);
    let casted_b = parseFloat(_b);
    if (isNaN(casted_a)) {
      casted_a = 0;
    }
    if (isNaN(casted_b)) {
      casted_b = 0;
    }

    return casted_a + casted_b;
  }, 0);

  // count of _valid_ items
  const count = data.reduce(
    (/** @type number **/ accumulator, /** @type string|number **/ item) =>
      item ? accumulator + 1 : accumulator,
    0,
  );
  return [sum / count, count];
}

/**
 * calculate the standard_deviation of a column
 * @param {number} average - average for column
 * @param {number} count - number of valid items
 * @param {(((raw: string|number) => string|null)|null)} [parser=null] -
 *   parser function for encoded values
 * @returns {[number, number]} standard deviations (population, sample)
 */
function _standard_deviation(average, count, parser = null) {
  const data = this.flatten();

  const almost_variance = data
    .map((/** @type string|number **/ item) => {
      /** distance from the mean, squared **/

      // normalize
      let _item;
      if (parser !== null) {
        _item = parser(item);
      } else {
        _item = item !== null ? item.toString() : "";
      }

      // transform into number
      let casted_item = parseFloat(_item);
      if (isNaN(casted_item)) {
        return null;
      }

      const diff = casted_item - average;
      return diff * diff;
    })
    .reduce((/** @type number|null **/ a, /** @type number|null **/ b) => {
      /** get sum **/
      if (a === null) {
        a = 0;
      }
      if (b === null) {
        b = 0;
      }
      return a + b;
    }, 0);

  return [
    Math.sqrt(almost_variance / count),
    Math.sqrt(almost_variance / (count - 1)),
  ];
}

/**
 * calculate the percentage of `true` values
 * @param {string|number} true_value - value considered as `true`
 * @returns {string} percentage (*100)
 */
function _true_percentage(true_value) {
  const data = this.flatten();
  const sum = data.reduce(
    (/** @type number **/ accumulator, /** @type string|number **/ item) =>
      item == true_value ? accumulator + 1 : accumulator,
    0,
  );
  return ((sum / data.length) * 100).toFixed(1);
}

// register req commands
DataTable.Api.register("average()", _average);
DataTable.Api.register("standardDeviation()", _standard_deviation);
DataTable.Api.register("truePercentage()", _true_percentage);

/**
 * @param {import("datatables.net").Config} settings - settings for datatable
 * @param {import("../types/types.d.ts").AnalyticalHeadersConfig} options - plugin options
 * @returns {AnalyticalHeaders} instance of plugin
 */
function _init(settings, options) {
  if (options === void 0) {
    options = null;
  }
  var api = new DataTable.Api(settings);
  var opts = options
    ? options
    : api.init().analyticalHeaders || DataTable.defaults.analyticalHeaders;
  var analyticalHeaders = new AnalyticalHeaders(api, opts);
  return analyticalHeaders;
}

// Attach a listener to the document which listens for DataTables initialisation
// events so we can automatically initialise
$(document).on("plugin-init.dt", function (e, settings) {
  if (e.namespace !== "dt") {
    return;
  }
  if (
    settings.oInit.analyticalHeaders ||
    DataTable.defaults.analyticalHeaders
  ) {
    if (!settings._analyticalHeaders) {
      _init(settings, null);
    }
  }
});
