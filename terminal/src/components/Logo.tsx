import React from 'react';
import { Box, Text } from 'ink';

const TOMATO = [
  `  ,---.  `,
  ` ( ,~. ) `,
  `(  \\_/  )`,
  `(       )`,
  ` (     ) `,
  `  '---'  `,
];

const OHTOMATO = [
  ` ██████╗ ██╗  ██╗████████╗ ██████╗ ███╗   ███╗ █████╗ ████████╗ ██████╗ `,
  `██╔═══██╗██║  ██║╚══██╔══╝██╔═══██╗████╗ ████║██╔══██╗╚══██╔══╝██╔═══██╗`,
  `██║   ██║███████║   ██║   ██║   ██║██╔████╔██║███████║   ██║   ██║   ██║`,
  `██║   ██║██╔══██║   ██║   ██║   ██║██║╚██╔╝██║██╔══██║   ██║   ██║   ██║`,
  `╚██████╔╝██║  ██║   ██║   ╚██████╔╝██║ ╚═╝ ██║██║  ██║   ██║   ╚██████╔╝`,
  ` ╚═════╝ ╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ `,
];

export default function Logo(): React.ReactElement {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box flexDirection="row">
        <Box flexDirection="column" marginRight={1}>
          {TOMATO.map((line, i) => (
            <Text key={i} color="red" bold>{line}</Text>
          ))}
        </Box>
        <Box flexDirection="column">
          {OHTOMATO.map((line, i) => (
            <Text key={i} color="red" bold>{line}</Text>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
