/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-undef */
/**
 * AnalyticHeaders Datatables extension
 * @module AnalyticalHeaders
 * @author Neal Joslin <neal@joslin.io>
 */
(function (factory) {
  if (typeof define === "function" && define.amd) {
    // AMD
    define(["jquery", "datatables.net"], function ($) {
      return factory($, window, document);
    });
  } else if (typeof exports === "object") {
    // CommonJS
    var jq = require("jquery");
    var cjsRequires = function (root, $) {
      if (!$.fn.dataTable) {
        require("datatables.net")(root, $);
      }
    };

    if (typeof window === "undefined") {
      module.exports = function (root, $) {
        if (!root) {
          // CommonJS environments without a window global must pass a
          // root. This will give an error otherwise
          root = window;
        }

        if (!$) {
          $ = jq(root);
        }

        cjsRequires(root, $);
        return factory($, root, root.document);
      };
    } else {
      cjsRequires(window, jq);
      module.exports = factory(jq, window, window.document);
    }
  } else {
    // Browser
    factory(jQuery, window, document);
  }
})(function ($, _window, document) {
  "use strict";
  const DataTable = $.fn.dataTable;

  (function ($) {
    /**
     * @class
     * @classdesc main functionality for extension
     */
    class AnalyticalHeaders {
      version = "1.0.0";
      defaults = {
        filter: {
          ignore: [],
          multi: false,
          encoded: {},
          encoded_check: false,
        },
        stats: {
          average: false,
          standard_deviation: false,
          targets: [],
          encoded: {},
          boolean: {},
          empty_background_color: "silver",
        },
      };

      /**
       * construct class
       * @param {import("datatables.net").Api} dt - datatable api
       * @param {import("analyticalheaders-dt").AnalyticalHeadersConfig|boolean} opts - plugin options
       */
      constructor(dt, opts) {
        if (
          typeof opts === "boolean" ||
          opts.filter === true ||
          opts.stats === true
        ) {
          return;
        }

        this.dt = dt;
        this.opts = {
          filter:
            opts.filter !== false
              ? $.extend({}, this.defaults.filter, opts.filter)
              : false,
          stats:
            opts.stats !== false
              ? $.extend({}, this.defaults.stats, opts.stats)
              : false,
        };

        if (typeof this.opts.filter !== "boolean") {
          this._create_filter_header(this.opts.filter);
        }

        if (
          typeof this.opts.stats !== "boolean" &&
          this.opts.stats.targets.length !== 0
        ) {
          this._create_average(this.opts.stats);
          this._create_standard_deviation(this.opts.stats);
          this.dt.on("draw", () => {
            if (typeof this.opts.stats !== "boolean") {
              this._calculate_values(this.dt, this.opts.stats);
            }
          });
        }

        this.dt.draw();
        this._update_headers();
      }

      /**
       * generate filter header
       * @param {import("analyticalheaders-dt").AnalyticalHeadersFilterConfig} opts - filter opts
       */
      _create_filter_header(opts) {
        const row = $("<tr></tr>").addClass("ah_filter").attr("role", "row");

        this.dt.columns(":visible").every(function () {
          let selectObj;
          if (!~opts.ignore.indexOf(this.index())) {
            // new select
            selectObj = $("<select></select>");

            if (
              opts.multi !== false &&
              (opts.multi === true || ~opts.multi.indexOf(this.index()))
            ) {
              selectObj.attr("multiple", "true").on("change", (e) => {
                const values = $(e.currentTarget).val();

                if (typeof values === "string" || typeof values === "number") {
                  // casting to make typescript happy
                  return;
                }

                // subtracting 1 so i can use this var in the loop if there's values
                let clear_search = false;
                const len = values.length - 1;
                let regex = "";
                if (len != -1) {
                  values.forEach((i, c) => {
                    if (i == "no-filter") {
                      clear_search = true;
                      return false;
                    }
                    regex += `(^${$.fn.dataTable.util.escapeRegex(i)}$)`;
                    if (len != c) {
                      regex += "|";
                    }
                  });
                }
                this.search(
                  clear_search ? () => true : regex,
                  true,
                  false,
                ).draw();
              });
            } else {
              selectObj.on("change", (e) => {
                if ($(e.currentTarget).val() == "no-filter") {
                  this.search(() => true, true, false).draw();
                  return;
                }
                // single item search
                var val = $.fn.dataTable.util.escapeRegex(
                  $(e.currentTarget).val().toString(),
                );
                // call search function and then redraw table
                this.search(val ? `^${val}$` : "", true, false).draw();
              });
            }

            // fill select field with unique values
            if (~Object.keys(opts.encoded).indexOf(this.index().toString())) {
              let extra_check;
              if (
                opts.encoded_check !== false &&
                (opts.encoded_check === true ||
                  ~opts.encoded_check.indexOf(this.index()))
              ) {
                extra_check = [];
              }
              // eslint-disable-next-line @typescript-eslint/no-this-alias
              const col = this;
              this.data()
                .unique()
                .sort()
                .each(function (d) {
                  const func = opts.encoded[col.index()];
                  const value = func(d);

                  if (value === null) {
                    return;
                  }

                  let add_item = false;
                  if (
                    extra_check !== undefined &&
                    !~extra_check.indexOf(value)
                  ) {
                    extra_check.push(value);
                    add_item = true;
                  } else {
                    add_item = true;
                  }

                  if (add_item) {
                    selectObj.append(
                      $("<option></option>").attr("value", value).html(value),
                    );
                  }
                });
            } else {
              let hasEmpty = false;
              this.data()
                .unique()
                .sort()
                .each(function (d) {
                  if (d != null && typeof d == "string" && d.trim() != "") {
                    // check if current cell is empty
                    selectObj.append(
                      $("<option></option>").attr("value", d).html(d),
                    );
                  } else if (!hasEmpty) {
                    hasEmpty = true;
                    selectObj.prepend(
                      $("<option></option>").attr("value", d).html(d),
                    );
                  }
                });
            }

            selectObj.prepend(
              $("<option></option>")
                .attr("value", "no-filter")
                .html("No Filter"),
            );
          }
          row.append(
            $("<th></th>")
              .addClass("ah_cell")
              .append(selectObj ? selectObj : ""),
          );
        });
        $(this.dt.table().header()).append(row);
      }

      /**
       * generate average header
       * @param {import("analyticalheaders-dt").AnalyticalHeadersStatsConfig} opts - stats opts
       */
      _create_average(opts) {
        const row = $("<tr></tr>").addClass("ah_avg").attr("role", "row");

        this.dt.columns(":visible").every(function () {
          let cell;
          if (this.index() == 0) {
            // first column gets info of what the row is
            cell = $("<th></th>")
              .css("text-align", "center")
              .addClass(`ah_cell ah_avg_${this.index()}`)
              .html("Averages");
          } else if (
            ~opts.targets.indexOf(this.index()) ||
            ~Object.keys(opts.encoded).indexOf(this.index().toString())
          ) {
            // Column gets an average cell
            cell = $("<th></th>")
              .css("text-align", "center")
              .addClass(`ah_cell ah_avg_${this.index()}`);
          } else {
            // Empty Cell
            cell = $("<th></th>")
              .css("background-color", opts.empty_background_color)
              .addClass("ah_cell");
          }
          row.append(cell);
        });

        $(this.dt.table().header()).append(row);
      }

      /**
       * generate standard deviation header
       * @param {import("analyticalheaders-dt").AnalyticalHeadersStatsConfig} opts - stats opts
       */
      _create_standard_deviation(opts) {
        const row = $("<tr></tr>").addClass("ah_stddev").attr("role", "row");

        this.dt.columns(":visible").every(function () {
          let cell;
          if (this.index() == 0) {
            // first column gets info of what the row is
            cell = $("<th></th>")
              .css("text-align", "center")
              .addClass("ah_cell")
              .html("Standard Deviation");
          } else if (this.index() == 1) {
            // StandardDev has two types, Population and Sample
            // add a button that lets the user toggle between the two
            var toggleBtn = $("<button></button>")
              .addClass("ah_stddev_toggle")
              .html("Population")
              .on("click", (e) => {
                if ($(e.currentTarget).html() == "Population") {
                  $(e.currentTarget).html("Sample");
                  $(".ah_stddev_population").attr("hidden", "true");
                  $(".ah_stddev_sample").removeAttr("hidden");
                } else {
                  $(e.currentTarget).html("Population");
                  $(".ah_stddev_sample").attr("hidden", "true");
                  $(".ah_stddev_population").removeAttr("hidden");
                }
              });

            cell = $("<th></th>")
              .css("text-align", "center")
              .addClass("ah_cell")
              .append(toggleBtn);
          } else if (
            ~opts.targets.indexOf(this.index()) ||
            ~Object.keys(opts.encoded).indexOf(this.index().toString())
          ) {
            // Column gets an Std cell
            cell = $("<th></th>")
              .css("text-align", "center")
              .addClass(`ah_cell ah_stddev_${this.index()}`);
          } else {
            cell = $("<th></th>")
              .css("background-color", opts.empty_background_color)
              .addClass("ah_cell");
          }
          row.append(cell);
        });

        $(this.dt.table().header()).append(row);
      }

      /**
       * update internal headers to include generated ones.
       * crude approximation of `_fnDetectHeader`
       */
      _update_headers() {
        const header = $(this.dt.table().header());

        /**
         * a header cell
         * @typedef {Object} HeaderItem
         * @property {ChildNode} cell - header cell
         * @property {boolean} unique - column is unique
         */

        /**
         * a header row's layout
         * @typedef {{[k: number]: HeaderItem, row?: HTMLTableRowElement, nTr?: HTMLTableRowElement}} HeaderRow
         */

        /**
         * layout of the table header
         * @typedef {HeaderRow[]} HeaderLayout
         */

        /** @type HeaderLayout **/
        var layout = [];

        var rows = $(header).children("tr");
        var row, nCell;
        var i, j, k, l, iLen, jLen, shifted, column, colspan, rowspan;
        var unique;
        var shift = function (
          /** @type HeaderLayout **/ a,
          /** @type number **/ row_num,
          /** @type number**/ column_num,
        ) {
          var k = a[row_num];
          while (k[column_num]) {
            column_num++;
          }
          return column_num;
        };

        layout.splice(0, layout.length);

        /* We know how many rows there are in the layout - so prep it */
        for (i = 0, iLen = rows.length; i < iLen; i++) {
          layout.push([]);
        }

        /* Calculate a layout array */
        for (i = 0, iLen = rows.length; i < iLen; i++) {
          row = rows[i];
          column = 0;

          /* For every cell in the row... */
          nCell = row.firstChild;
          const rowChildren = row.children;

          for (j = 0, jLen = rowChildren.length; j < jLen; j++) {
            nCell = rowChildren[j];

            if (
              nCell.nodeName.toUpperCase() == "TD" ||
              nCell.nodeName.toUpperCase() == "TH"
            ) {
              /* Get the col and rowspan attributes from the DOM and sanitise them */
              colspan = parseInt(nCell.getAttribute("colspan"));
              rowspan = parseInt(nCell.getAttribute("rowspan"));
              colspan =
                !colspan || colspan === 0 || colspan === 1 ? 1 : colspan;
              rowspan =
                !rowspan || rowspan === 0 || rowspan === 1 ? 1 : rowspan;

              /* There might be colspan cells already in this row, so shift our target
               * accordingly
               */
              shifted = shift(layout, i, column);

              /* Cache calculation for unique columns */
              unique = colspan === 1 ? true : false;

              /* If there is col / rowspan, copy the information into the layout grid */
              for (l = 0; l < colspan; l++) {
                for (k = 0; k < rowspan; k++) {
                  layout[i + k][shifted + l] = {
                    cell: nCell,
                    unique: unique,
                  };
                  layout[i + k].row = row;
                  // for backwards compatibility
                  layout[i + k].nTr = row;
                }
              }
            }
          }
        }

        this.dt.context[0]["aoHeader"] = layout;
      }

      /**
       * calculate stats
       * @param {import("datatables.net").Api} dt - datatable api
       * @param {import("analyticalheaders-dt").AnalyticalHeadersStatsConfig} opts - stats opts
       */
      _calculate_values(dt, opts) {
        const header = $(this.dt.table().header());
        if (opts.targets.length) {
          let len;
          let avg;

          opts.targets.forEach((col) => {
            const parser = opts.encoded[col];

            if (opts.average) {
              const res = dt
                .column(col, {
                  search: "applied",
                  filter: "applied",
                })
                .data()
                .averageAndCount(parser);

              // unpack res
              len = res.count;
              avg = res.average;
              let txt = "";

              if (!isNaN(avg)) {
                const tmp = avg.toFixed(2);
                if (parseFloat(tmp) === 0) {
                  txt = avg.toFixed(3);
                } else {
                  txt = tmp;
                }
              }

              $(header).find(`.ah_avg_${col}`).html(txt);
            }

            if (opts.standard_deviation) {
              const res = dt
                .column(col, {
                  search: "applied",
                  filter: "applied",
                })
                .data()
                .standardDeviation(avg, len, parser);

              $(header)
                .find(`.ah_stddev_${col}`)
                .empty()
                .append(
                  $("<span class='ah_stddev_population'></span>").append(
                    !isNaN(res.population) && res.population != 0
                      ? res.population.toFixed(2)
                      : "",
                  ),
                )
                .append(
                  $("<span class='ah_stddev_sample'></span>").append(
                    !isNaN(res.sample) && res.sample != 0
                      ? res.sample.toFixed(2)
                      : "",
                  ),
                );

              // depending on the button
              //  show / hide the correct span
              if ($(".ah_stddev_toggle").html() == "Population") {
                $(".ah_stddev_sample").attr("hidden", "true");
              } else {
                $(".ah_stddev_population").attr("hidden", "true");
              }
            }
          });

          if (Object.keys(opts.boolean).length) {
            Object.keys(opts.boolean).forEach((key) => {
              // bool col
              $(header)
                .find(`.ah_avg_${key.toString()}`)
                .html(
                  dt
                    .column(key, { search: "applied", filter: "applied" })
                    .data()
                    .truePercentage(opts.boolean[key]) + "%",
                );
            });
          }
        }
      }
    }

    /**
     * calculate the average of a column
     * @param {(((raw: string|number) => string|null)|null)} [parser=null] -
     *   parser function for encoded values
     * @returns {{average: number, count:number}} average and count
     */
    function _average_and_count(parser = null) {
      const data = this.flatten();

      const sum = data.reduce(
        (
          /** @type number **/ accumulator,
          /** @type string|number **/ item,
        ) => {
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
            return accumulator;
          }

          return accumulator + casted_item;
        },
        0,
      );

      // count of _valid_ items
      const count = data.reduce(
        (/** @type number **/ accumulator, /** @type string|number **/ item) =>
          item ? accumulator + 1 : accumulator,
        0,
      );
      return {
        average: sum / count,
        count: count,
      };
    }

    /**
     * calculate the standard_deviation of a column
     * @param {number} average - average for column
     * @param {number} count - number of valid items
     * @param {(((raw: string|number) => string|null)|null)} [parser=null] -
     *   parser function for encoded values
     * @returns {{population: number, sample: number}}
     *   standard deviations (population, sample)
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
        .reduce(
          (/** @type number **/ accumulator, /** @type number **/ item) => {
            /** get sum **/
            if (item === null) {
              return accumulator;
            }
            return accumulator + item;
          },
          0,
        );

      return {
        population: Math.sqrt(almost_variance / count),
        sample: Math.sqrt(almost_variance / (count - 1)),
      };
    }

    /**
     * calculate the percentage of `true` values
     * @param {(raw: string|number) => boolean} [decider] -
     *   decider function to determine if true
     * @returns {string} percentage (*100)
     */
    function _true_percentage(decider) {
      const data = this.flatten();
      const sum = data.reduce(
        (/** @type number **/ accumulator, /** @type string|number **/ item) =>
          decider(item) ? accumulator + 1 : accumulator,
        0,
      );
      return ((sum / data.length) * 100).toFixed(1);
    }

    // register req commands
    DataTable.Api.register("averageAndCount()", _average_and_count);
    DataTable.Api.register("standardDeviation()", _standard_deviation);
    DataTable.Api.register("truePercentage()", _true_percentage);

    /**
     * @param {import("datatables.net").Config} settings - settings for datatable
     * @param {import("analyticalheaders-dt").AnalyticalHeadersConfig} options - plugin options
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

    // Attach a listener for options /before/ they are passed into any
    // Datatable. This is to override Button exporting function to exclude the
    // additional headers.
    $(document).on("options.dt", function (e, settings) {
      if (e.namespace !== "dt") {
        return;
      }

      if (settings.buttons) {
        const isExport = (/** @type string */ item) => {
          return (
            item &&
            (item.includes("copy") ||
              item.includes("excel") ||
              item.includes("csv"))
          );
        };
        const customizeData = (
          /** @type {import("analyticalheaders-dt").ButtonsExportCustomizeData} */ data,
        ) => {
          data["headerStructure"] = [data["headerStructure"][0]];
          data["header"] = data["headerStructure"][0].map((x) => x.title);
        };
        const injected_settings = [];
        settings.buttons.forEach((/** @type string | object */ item) => {
          if (typeof item === "string" && isExport(item)) {
            injected_settings.push({
              extend: item,
              exportOptions: {
                columns: ":visible",
                customizeData: customizeData,
              },
            });
          } else if (
            typeof item === "object" &&
            isExport(item.extend) &&
            !("customizeData" in item)
          ) {
            const _item = item;
            _item.exportOptions = {
              columns: ":visible",
              customizeData: customizeData,
            };
            injected_settings.push(_item);
          } else {
            injected_settings.push(item);
          }
        });
        settings.buttons = injected_settings;
      }
    });
  })(jQuery);
});
