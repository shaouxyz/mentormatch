import React from 'react';
import { render } from '@testing-library/react-native';

// Mock Ionicons to avoid native/vector dependency issues
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

// Mock expo-router Tabs in-factory so `Tabs.Screen` exists
jest.mock('expo-router', () => {
  const React = require('react');
  const Tabs = jest.fn(({ children }: any) => React.createElement(React.Fragment, null, children));
  (Tabs as any).Screen = jest.fn(({ children }: any) => React.createElement(React.Fragment, null, children));
  return { Tabs };
});

import TabsLayout from '../(tabs)/_layout';

describe('TabsLayout', () => {
  it('should render tab layout and define all tabs', () => {
    render(<TabsLayout />);

    const { Tabs } = require('expo-router');

    // The component renders <Tabs> once
    expect(Tabs).toHaveBeenCalledTimes(1);

    // It defines 5 screens: home, messages, mentorship, requests, profile
    expect((Tabs as any).Screen).toHaveBeenCalledTimes(5);

    const screenCalls = (Tabs as any).Screen.mock.calls.map((c: any[]) => c[0]?.name);
    expect(screenCalls).toEqual(['home', 'messages', 'mentorship', 'requests', 'profile']);

    // Execute tabBarIcon render functions to cover those lines/branches
    const screenProps = (Tabs as any).Screen.mock.calls.map((c: any[]) => c[0]);
    for (const props of screenProps) {
      const iconFn = props?.options?.tabBarIcon;
      if (typeof iconFn === 'function') {
        iconFn({ color: '#000', size: 24 });
      }
    }
  });
});

