import React, {useEffect, useReducer} from 'react';
import './App.scss';
import {Container, Navbar} from 'react-bootstrap';
import Flashes, {Flash, FlashSeverity} from './common/components/Flashes';
import AppContext from './common/Context';
import GoboStack from './GoboStack';
import Spinner, {SpinningGobo} from './Spinner';
import Permalink, {goboStackFromUrl} from './Permalink';
import Loading from './common/components/Loading';
import {AxiosError} from 'axios';

interface AppState {
    flashes: Flash[]
    gobos?: SpinningGobo[]
}

function App() {
    const [state, setState] = useReducer((state: AppState, newState: Partial<AppState>) => ({...state, ...newState}), {
        flashes: [],
    } as AppState);
    const setFlashes = React.useCallback((flashes: Flash[]) => setState({flashes: flashes}), []);
    const setGobos = React.useCallback((gobos: SpinningGobo[]) => setState({gobos: gobos}), []);
    const appContext = {
        setFlashes: setFlashes,
        setGobos: setGobos,
    };

    // Get the stack from the URL
    useEffect(() => {
        goboStackFromUrl()
            .then(stack => setGobos(stack))
            .catch((error: AxiosError) => {
                console.log(error.message);
                setFlashes([{severity: FlashSeverity.DANGER, message: 'Error loading stack from URL.'}]);
                setGobos([]);
            });
    }, [setGobos, setFlashes]);

    return (
        <div className="content-wrapper">
            <AppContext.Provider value={appContext}>
                <Navbar variant="dark"
                        bg="primary"
                        fixed="top"
                >
                    <Container fluid>
                        <Navbar.Brand>Multi-Spin</Navbar.Brand>
                    </Container>
                </Navbar>

                <Container as="main">
                    <Flashes flashes={state.flashes}/>
                    {state.gobos === undefined && <Loading/>}
                    {state.gobos !== undefined && (
                        <>
                            <Spinner stack={state.gobos}/>
                            <GoboStack gobos={state.gobos}/>
                            <Permalink stack={state.gobos}/>
                        </>
                    )}
                </Container>
            </AppContext.Provider>
        </div>
    );
}

export default App;
