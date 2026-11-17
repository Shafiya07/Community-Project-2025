
import './App.css';
import AllRoutes from './Pages/AllRoutes';
import { LanguageProvider } from "./i18n/LanguageContext";

function App() {
  return (
    <div className="App">
      <LanguageProvider>
        <AllRoutes />
      </LanguageProvider>
    </div>
  );
}

export default App;
