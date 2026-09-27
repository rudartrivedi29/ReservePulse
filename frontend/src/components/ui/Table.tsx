import React, { createContext, useContext } from 'react';

type TableDensity = 'compact' | 'normal' | 'spacious';

interface TableContextValue {
  density: TableDensity;
  striped?: boolean;
  hoverable?: boolean;
}

const TableContext = createContext<TableContextValue>({
  density: 'normal',
  striped: false,
  hoverable: true,
});

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  density?: TableDensity;
  striped?: boolean;
  hoverable?: boolean;
  containerClassName?: string;
}

export const Table: React.FC<TableProps> = ({
  density = 'normal',
  striped = false,
  hoverable = true,
  className = '',
  containerClassName = '',
  children,
  ...props
}) => {
  return (
    <TableContext.Provider value={{ density, striped, hoverable }}>
      <div
        className={`w-full overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-xs ${containerClassName}`}
      >
        <table
          className={`w-full text-left border-collapse text-slate-700 font-sans ${className}`}
          {...props}
        >
          {children}
        </table>
      </div>
    </TableContext.Provider>
  );
};

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <thead
    className={`bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider ${className}`}
    {...props}
  >
    {children}
  </thead>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <tbody className={`divide-y divide-slate-100 ${className}`} {...props}>
    {children}
  </tbody>
);

export const TableFooter: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <tfoot
    className={`bg-slate-50/80 border-t border-slate-200 text-xs font-medium text-slate-500 ${className}`}
    {...props}
  >
    {children}
  </tfoot>
);

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  isSelected?: boolean;
}

export const TableRow: React.FC<TableRowProps> = ({
  isSelected = false,
  className = '',
  children,
  ...props
}) => {
  const { hoverable, striped } = useContext(TableContext);

  return (
    <tr
      className={`
        transition-colors duration-150
        ${striped ? 'even:bg-slate-50/40' : ''}
        ${hoverable ? 'hover:bg-emerald-50/40' : ''}
        ${isSelected ? 'bg-emerald-50/80' : ''}
        ${className}
      `.trim()}
      {...props}
    >
      {children}
    </tr>
  );
};

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
}

export const TableHead: React.FC<TableHeadProps> = ({
  sortable = false,
  sortDirection,
  onSort,
  className = '',
  children,
  ...props
}) => {
  const { density } = useContext(TableContext);

  const paddingClasses: Record<TableDensity, string> = {
    compact: 'px-3 py-2 text-xs',
    normal: 'px-4 py-3 text-xs',
    spacious: 'px-6 py-4 text-xs',
  };

  return (
    <th
      className={`
        font-bold text-slate-700 tracking-wider
        ${paddingClasses[density]}
        ${sortable ? 'cursor-pointer select-none hover:text-emerald-700' : ''}
        ${className}
      `.trim()}
      onClick={sortable ? onSort : undefined}
      {...props}
    >
      <div className="flex items-center gap-1.5">
        <span>{children}</span>
        {sortable && (
          <span className="flex flex-col text-slate-400">
            {sortDirection === 'asc' ? (
              <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
            ) : sortDirection === 'desc' ? (
              <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 opacity-40 hover:opacity-100" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 8l5-5 5 5H5zm10 4l-5 5-5-5h10z" />
              </svg>
            )}
          </span>
        )}
      </div>
    </th>
  );
};

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className = '',
  children,
  ...props
}) => {
  const { density } = useContext(TableContext);

  const paddingClasses: Record<TableDensity, string> = {
    compact: 'px-3 py-2 text-xs',
    normal: 'px-4 py-3 text-sm',
    spacious: 'px-6 py-4 text-base',
  };

  return (
    <td
      className={`text-slate-800 ${paddingClasses[density]} ${className}`.trim()}
      {...props}
    >
      {children}
    </td>
  );
};

export const TableCaption: React.FC<React.HTMLAttributes<HTMLTableCaptionElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <caption className={`p-3 text-xs text-slate-500 italic ${className}`} {...props}>
    {children}
  </caption>
);
