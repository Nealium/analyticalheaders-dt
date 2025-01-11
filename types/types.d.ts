/// <reference types="jquery" />

import DataTables from "datatables.net";

interface AnalyticalHeadersFilterConfig {
  /**
   * columns to not generate a filter for
   *
   * @remark
   * it was chosen to filter all by default as that is usually the case.
   */
  ignore: number[];
  /**
   * filters to set the `multiple` attribute to `true`
   *
   * @remark
   * setting this field to `true` will make *all* the fields multiple
   */
  multi: number[] | boolean;
  /**
   * encoded columns and their decode function.
   *
   * @remark
   * when the function returns `null` the item will be discarded
   *
   * @example
   * ```javascript
   * {
   *   2: (raw) => {
   *     // `${url}`__${display_value}
   *     raw.split("__");
   *     return (raw[1] ? raw[1] : null)
   *   },
   * }
   * ```
   */
  encoded: { column_index: (raw: string) => string | null };
  /**
   * encoded columns to check for duplicates
   *
   * @remark
   * This, I assume, is more expensive and that is why it is optional
   *
   * @remark
   * setting this field to `true` will check **all** encoded fields
   *
   * @example
   * This would be an example value that you would want to use this setting on.
   * the built in datatable `unique()` wouldn't handle this.
   * ```javascript
   * `${url_with_primary_key}`__${row_type}
   * ```
   */
  encoded_check: number[] | boolean;
}
interface AnalyticalHeadersStatsConfig {
  /** generate average header **/
  average: boolean;
  /** generate standard deviation header **/
  standard_deviation: boolean;
  /** columns to calculate stats for */
  targets: number[];
  /**
   * encoded columns and their decode function.
   *
   * @remark
   * when the function returns `null` the item will be discarded
   *
   * @example
   * ```javascript
   * {
   *   2: (raw) => {
   *     // `${background_color}`__${value}
   *     raw.split("__");
   *     return (raw[1] ? raw[1] : null)
   *   },
   * }
   * ```
   */
  encoded: { column_index: (raw: string) => string | null };
  /**
   * `boolean` columns and their `true` value. This will show a Percentage true
   * in the average header
   *
   * @example
   * ```javascript
   * {
   *   2: (raw) => raw == "Pass",
   * }
   * ```
   */
  boolean: { column_index: (raw: string) => boolean | null;  };
  /**
   * background of cells that are not targeted
   *
   * @remark
   * the default value is `silver`
   */
  empty_background_color: string;
}
interface AnalyticalHeadersConfig {
  filter: AnalyticalHeadersFilterConfig | boolean;
  stats?: AnalyticalHeadersStatsConfig | boolean;
}

declare module "datatables.net" {
  interface Config {
    /* AnalyticalHeaders options */
    analyticalHeaders?: AnalyticalHeadersConfig;
  }

  interface Api {
    average(
      parser: ((raw: string | number) => string | null) | null,
    ): [number, number];
    standardDeviation(
      average: number,
      count: number,
      parser: ((raw: string | number) => string | null) | null,
    ): [number, number];
    truePercentage(true_value: string): string;
  }

  interface ExtApiSelectorModifier extends ApiSelectorModifier {
    /**
     * backwards compatible typing for new `search`
     * Values: 'none', 'applied', 'removed'
     */
    filter?: string;
  }

  export interface ApiColumn<T> {
    /**
     * backwards compatible `column(col_num, { _modifier_ })`
     *
     * @param columnSelector Column selector.
     * @param modifier Option used to specify how the cells should be ordered, and if paging or filtering in the table should be taken into account.
     */
    (
      columnSelector: ColumnSelector,
      modifier?: ExtApiSelectorModifier,
    ): ApiColumnMethods<T>;
  }
}

export default DataTables;
export {
  DataTables,
  AnalyticalHeadersConfig,
  AnalyticalHeadersFilterConfig,
  AnalyticalHeadersStatsConfig,
};
