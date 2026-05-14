import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/geist-sans'
import '@fontsource/geist-mono'
import './index.css'
import Finwise from './finwise_app'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Finwise />
  </React.StrictMode>,
)
