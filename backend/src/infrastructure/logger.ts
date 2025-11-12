import pino from 'pino';

const transport = process.env.NODE_ENV !== 'production' 
  ? { 
      target: 'pino-pretty', 
      options: { 
        colorize: true,
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname',
        messageFormat: '{msg}',
        customColors: 'info:blue,warn:yellow,error:red,debug:magenta',
        errorLikeObjectKeys: ['err', 'error'],
        singleLine: false,
        levelFirst: true,
        // Evitar problemas de encoding com emojis
        hideObject: false,
        // Usar símbolos ASCII ao invés de emojis
        customPrettifiers: {
          level: (logLevel: string) => {
            const levels: Record<string, string> = {
              '10': '[TRACE]',
              '20': '[DEBUG]',
              '30': '[INFO] ',
              '40': '[WARN] ',
              '50': '[ERROR]',
              '60': '[FATAL]',
            };
            return levels[logLevel] || `[${logLevel}]`;
          },
        },
      } 
    } 
  : undefined;

export const logger = pino({
  level: process.env.PINO_LOG_LEVEL || 'info',
  transport,
});