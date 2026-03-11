import React from 'react';
import { Box, Text } from 'ink';

type InlineNode =
  | { kind: 'text';   content: string }
  | { kind: 'bold';   content: string }
  | { kind: 'italic'; content: string }
  | { kind: 'code';   content: string };

function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push({ kind: 'text', content: text.slice(last, m.index) });
    if (m[1] !== undefined)      nodes.push({ kind: 'bold',   content: m[1] });
    else if (m[2] !== undefined) nodes.push({ kind: 'italic', content: m[2] });
    else if (m[3] !== undefined) nodes.push({ kind: 'code',   content: m[3] });
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push({ kind: 'text', content: text.slice(last) });
  return nodes;
}

function InlineText({ text }: { text: string }): React.ReactElement {
  const nodes = parseInline(text);
  return (
    <Text>
      {nodes.map((n, i) => {
        if (n.kind === 'bold')   return <Text key={i} bold>{n.content}</Text>;
        if (n.kind === 'italic') return <Text key={i} italic>{n.content}</Text>;
        if (n.kind === 'code')   return <Text key={i} color="yellow">{n.content}</Text>;
        return <Text key={i}>{n.content}</Text>;
      })}
    </Text>
  );
}

export default function MarkdownText({ children }: { children: string }): React.ReactElement {
  const lines = children.split('\n');
  const elements: React.ReactElement[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <Box key={`cb-${i}`} flexDirection="column" borderStyle="round" borderColor="red" paddingX={1} marginY={0}>
          {lang !== '' && <Text color="gray" dimColor>{lang}</Text>}
          {codeLines.map((l, j) => <Text key={j} color="yellow">{l}</Text>)}
        </Box>
      );
      i++; // skip closing ```
      continue;
    }

    const hm = line.match(/^(#{1,3})\s+(.+)/);
    if (hm) {
      const color = hm[1].length === 1 ? 'red' : hm[1].length === 2 ? 'red' : 'white';
      elements.push(<Text key={`h-${i}`} color={color as 'red' | 'white'} bold>{hm[2]}</Text>);
      i++;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      elements.push(<Text key={`hr-${i}`} color="gray">{'─'.repeat(48)}</Text>);
      i++;
      continue;
    }

    const bm = line.match(/^[-*+]\s+(.+)/);
    if (bm) {
      elements.push(
        <Box key={`ul-${i}`}>
          <Text color="red">• </Text>
          <InlineText text={bm[1]} />
        </Box>
      );
      i++;
      continue;
    }

    const nm = line.match(/^(\d+)\.\s+(.+)/);
    if (nm) {
      elements.push(
        <Box key={`ol-${i}`}>
          <Text color="red">{nm[1]}. </Text>
          <InlineText text={nm[2]} />
        </Box>
      );
      i++;
      continue;
    }

    const bq = line.match(/^>\s*(.*)/);
    if (bq) {
      elements.push(
        <Box key={`bq-${i}`}>
          <Text color="gray">│ </Text>
          <InlineText text={bq[1]} />
        </Box>
      );
      i++;
      continue;
    }

    if (line.trim() === '') {
      // Only emit a blank line if the previous element wasn't also blank
      if (elements.length > 0) elements.push(<Text key={`nl-${i}`}>{''}</Text>);
      i++;
      continue;
    }

    elements.push(
      <Box key={`p-${i}`}><InlineText text={line} /></Box>
    );
    i++;
  }

  return <Box flexDirection="column">{elements}</Box>;
}
