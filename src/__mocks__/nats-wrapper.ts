import { logIt, LogType } from '@nielsendigital/ms-common';

export const natsWrapper = {
  client: {
    publish: jest
      .fn()
      .mockImplementation(
        (topic: string, data: string, callback: () => void) => {
          logIt.out(LogType.NOTICE, 'Nats wrapper __MOCK__ running');
          callback();
        }
      ),
  },
};
