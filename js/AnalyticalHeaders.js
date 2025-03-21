/**
 * AnalyticHeaders Datatables extension
 * @module AnalyticalHeaders
 * @author Neal Joslin <neal@joslin.io>
 */
//@ts-check

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
      encoded_filter: false,
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
   * @param {import("../types/types.d.ts").AnalyticalHeadersConfig|boolean} opts - plugin options
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
   * @param {import("../types/types.d.ts").AnalyticalHeadersFilterConfig} opts - filter opts
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

            let search = null;
            if (~values.indexOf("no-filter")) {
              // clear search
              search = () => true;
            } else if (
              ~Object.keys(opts.encoded_filter).indexOf(this.index().toString())
            ) {
              // custom search
              search = (/** @type {string} */ _, /** @type any[] */ data) => {
                const columnData = data[this.index()];
                return opts.encoded_filter[this.index()](
                  values,
                  columnData,
                  data,
                );
              };
            } else {
              // default regex search [exact match]
              search = "";
              const len = values.length - 1;
              if (len != -1) {
                values.forEach((i, c) => {
                  search += `(^${$.fn.dataTable.util.escapeRegex(i)}$)`;
                  if (len != c) {
                    search += "|";
                  }
                });
              }
            }
            this.search(search, true, false).draw();
          });
        } else {
          selectObj.on("change", (e) => {
            const value = $(e.currentTarget).val().toString();
            let search = null;
            if (value == "no-filter") {
              // clear search
              search = () => true;
            } else if (
              ~Object.keys(opts.encoded_filter).indexOf(this.index().toString())
            ) {
              // custom search
              search = (/** @type {string} */ _, /** @type any[] */ data) => {
                const columnData = data[this.index()];
                return opts.encoded_filter[this.index()](
                  value,
                  columnData,
                  data,
                );
              };
            } else {
              // single item search
              const re = $.fn.dataTable.util.escapeRegex(
                $(e.currentTarget).val().toString(),
              );
              search = re ? `^${re}$` : "^$";
            }
            // call search function and then redraw table
            this.search(search, true, false).draw();
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
              if (extra_check !== undefined) {
                if (!~extra_check.indexOf(value)) {
                  extra_check.push(value);
                  add_item = true;
                }
              } else {
                add_item = true;
              }

              if (add_item) {
                selectObj.append(
                  $("<option></option>")
                    .attr("value", value)
                    .html(value.toString()),
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

        selectObj
          .prepend(
            $("<option></option>").attr("value", "no-filter").html("No Filter"),
          )
          .val("no-filter");
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
   * @param {import("../types/types.d.ts").AnalyticalHeadersStatsConfig} opts - stats opts
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
   * @param {import("../types/types.d.ts").AnalyticalHeadersStatsConfig} opts - stats opts
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
          colspan = !colspan || colspan === 0 || colspan === 1 ? 1 : colspan;
          rowspan = !rowspan || rowspan === 0 || rowspan === 1 ? 1 : rowspan;

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
   * @param {import("../types/types.d.ts").AnalyticalHeadersStatsConfig} opts - stats opts
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
export default AnalyticalHeaders;
