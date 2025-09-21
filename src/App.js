/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import AppProvider from './AppProvider';
import Calculator from './Calculator';

function App(){
  return (
    <>
    <AppProvider>
      <Calculator/>
    </AppProvider>
    </>
  );
}

export default App;
