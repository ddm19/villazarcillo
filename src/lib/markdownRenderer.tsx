import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { TableView } from '../components/TableView';
import { markdownContentToString } from './markdown';
import type { MarkdownContent } from './types';

export function renderMarkdownContent(content: MarkdownContent, key?: string | number): React.ReactNode {
  if (typeof content === 'string') {
    return <ReactMarkdown key={key} rehypePlugins={[rehypeRaw]}>{content}</ReactMarkdown>;
  }

  if (Array.isArray(content)) {
    return content.map((item, index) => renderMarkdownContent(item, index));
  }

  if (typeof content === 'object' && content !== null) {

    switch (content.type) {
      case 'paragraph':
        return (
          <p key={key}>
            <ReactMarkdown rehypePlugins={[rehypeRaw]}>
              {markdownContentToString(content.text)}
            </ReactMarkdown>
          </p>
        );
      case 'heading': {

        const HeadingTag = (`h${content.level || 3}`) as React.ElementType;
        return (
          <HeadingTag key={key}>
            <ReactMarkdown rehypePlugins={[rehypeRaw]}>
              {markdownContentToString(content.text)}
            </ReactMarkdown>
          </HeadingTag>
        );
      }
      case 'list': {

        const ListTag = content.ordered ? 'ol' : 'ul';
        return (
          <ListTag key={key}>
            {content.items.map((item, index) => (
              <li key={index}>
                <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                  {markdownContentToString(item)}
                </ReactMarkdown>
              </li>
            ))}
          </ListTag>
        );
      }
      case 'quote':
        return (
          <blockquote key={key}>
            {content.items.map((item, index) => (
              <ReactMarkdown key={index} rehypePlugins={[rehypeRaw]}>
                {markdownContentToString(item)}
              </ReactMarkdown>
            ))}
          </blockquote>
        );
      case 'code':
        return (
          <pre key={key}>
            <code>{content.value}</code>
          </pre>
        );
      case 'table':
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return <TableView key={key} columns={content.columns} rows={content.rows} />;
      default:
        return null;
    }
  }

  return null;
}
