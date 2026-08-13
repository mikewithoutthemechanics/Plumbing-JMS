import OfflineIndicator from './OfflineIndicator';

export default {
  component: OfflineIndicator,
  title: 'offline-indicator/OfflineIndicator',
  tags: ['autodocs'],
};

export const Online = {
  args: {
    isOnline: true,
  },
};

export const Offline = {
  args: {
    isOnline: false,
  },
};