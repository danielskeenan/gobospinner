import {createContext} from 'react';
import {Flash} from './components/Flashes';
import {SpinningGobo} from '../Spinner';

export interface AppContextProps {
    setFlashes?: (flashes: Flash[]) => void
    setGobos: (gobos: SpinningGobo[]) => void
}

const AppContext = createContext({} as AppContextProps);

export default AppContext;
