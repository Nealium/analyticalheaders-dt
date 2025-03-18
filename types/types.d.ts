/// <reference types="jquery" />

import DataTables from "datatables.net";

interface AnalyticalHeadersFilterConfig {
  /**
   * columns to _not_ generate a filter for
   *
   * @remark
   * it was chosen to filter all by default as that is usually the case.
   */
  ignore?: number[];
  /**
   * filters to set the `multiple` attribute to `true`
   *
   * @remark
   * setting this field to `true` will make *all* the fields multiple
   */
  multi?: number[] | boolean;
  /**
   * encoded columns and their decode function for creating select options
   *
   * @remark
   * when the function returns `null` the item will be discarded
   *
   * @example
   * ```javascript
   * {
   *   2: (data) => {
   *     // `${url}`__${display_value}
   *     const _d = data.split("__");
   *     return _d[1] ? _d[1] : null;
   *   },
   *   3: (data) => {
   *     return data['class'] ? data['class'] : null;
   *   },
   * }
   * ```
   */
  encoded?: {
    [column_index: string | number]: (data: unknown) => number | string | null;
  };
  /**
   * encoded columns that should manually decoded when creating options to root
   * out duplicates
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
  encoded_check?: number[] | boolean;
  /**
   * encoded columns with custom filters
   *
   * @remark
   * datatables usually filters based on what is shown on the column. This would
   * allow you to filter based on an encoded value not shown.
   *
   * @example
   * {
   *   2: (value: string, colData: string) => {
   *     if (d){
   *       const _d = colData.split("__");
   *       return _d[1] === value;
   *     };
   *     return false;
   *   },
   *   9: (values: string[], colData: {key: any}) => {
   *     return ~values.indexOf(colData["class"]) ? true : false;
   *   },
   * }
   */
  encoded_filter?: {
    [column_index: string | number]: (
      value: string | string[],
      colData: unknown,
      rowData?: unknown,
    ) => boolean;
  };
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
   *   2: (data) => {
   *     // `${background_color}`__${value}
   *     const _d = data.split("__");
   *     return (_d[1] ? _d[1] : null);
   *   },
   * }
   * ```
   */
  encoded: {
    [column_index: string | number]: (data: string) => string | null;
  };
  /**
   * `boolean` columns and their `true` value. This will show a Percentage true
   * in the average header
   *
   * @example
   * ```javascript
   * {
   *   2: (data) => data == "Pass",
   * }
   * ```
   */
  boolean: {
    [column_index: string | number]: (data: string) => boolean | null;
  };
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

interface TableElementStructure {
  /** colspan of cell */
  colspan: number;
  /** rowspan of cell */
  rowspan: number;
  /** text of cell */
  title: string;
}
interface ButtonsExportCustomizeData {
  /** compiled tbody of datatable */
  body: string[][];
  /** compiled footer of datatable */
  footer: string[];
  /** structure of footer */
  footerStructure: TableElementStructure[][];
  /** compiled header of datatable */
  header: string[];
  /** structure of header */
  headerStructure: TableElementStructure[][];
}

declare module "datatables.net" {
  interface Config {
    /* AnalyticalHeaders options */
    analyticalHeaders?: AnalyticalHeadersConfig;
  }

  interface Api {
    averageAndCount(
      parser: ((data: string | number) => string | null) | null,
    ): {
      average: number;
      count: number;
    };
    standardDeviation(
      average: number,
      count: number,
      parser: ((data: string | number) => string | null) | null,
    ): { population: number; sample: number };
    truePercentage(decider: (data: string|number) => boolean): string;
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
  TableElementStructure,
  ButtonsExportCustomizeData,
};
