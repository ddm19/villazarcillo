import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { markdownContentToString } from '../lib/markdown';
import type { TableCell } from '../lib/types';


function renderCell(cell: TableCell) {
  if (typeof cell === 'string') {
    return cell;
  }

  if ('markdown' in cell) {
    const content = markdownContentToString(cell.markdown);
    return (
      <div className="camp-hub__markdown">
        <ReactMarkdown rehypePlugins={[rehypeRaw]}>{content}</ReactMarkdown>
      </div>
    );
  }

  if (cell.href) {
    return (
      <a href={cell.href} target="_blank" rel="noreferrer">
        {cell.text}
        <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="1.2rem" height="1.2rem" viewBox="0 0 24 24">
          <path d="M 5 3 C 3.9069372 3 3 3.9069372 3 5 L 3 19 C 3 20.093063 3.9069372 21 5 21 L 19 21 C 20.093063 21 21 20.093063 21 19 L 21 12 L 19 12 L 19 19 L 5 19 L 5 5 L 12 5 L 12 3 L 5 3 z M 14 3 L 14 5 L 17.585938 5 L 8.2929688 14.292969 L 9.7070312 15.707031 L 19 6.4140625 L 19 10 L 21 10 L 21 3 L 14 3 z"></path>
        </svg>
      </a>
    );
  }

  return cell.text;
}

export function TableView({ columns, rows }: { columns: string[]; rows: TableCell[][] }) {
  return (
    <table className="camp-hub__table">
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column}>{column}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex}>{renderCell(cell)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
