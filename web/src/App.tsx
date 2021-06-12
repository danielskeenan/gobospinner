import React, {useEffect, useReducer, useState} from 'react';
import './App.scss';
import {Col, Container, Form, Nav, Navbar, Row} from 'react-bootstrap';
import Flashes, {Flash, FlashSeverity} from './common/components/Flashes';
import AppContext from './common/Context';
import GoboStack from './GoboStack';
import Spinner, {SpinningGobo} from './Spinner';
import Permalink, {blurFromUrl, goboStackFromUrl} from './Permalink';
import Loading from './common/components/Loading';
import {AxiosError} from 'axios';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faGithub} from '@fortawesome/free-brands-svg-icons';
import appIcon from './assets/icon.svg';
import appConfig from './appConfig.json';

interface AppState {
    flashes: Flash[]
    gobos?: SpinningGobo[]
}

function App() {
    const [state, setState] = useReducer((state: AppState, newState: Partial<AppState>) => ({...state, ...newState}), {
        flashes: [],
    } as AppState);
    const [goboBlur, setGoboBlur] = useState(blurFromUrl());
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
                        <Navbar.Brand>
                            <img src={appIcon} alt=""/>
                            &nbsp;Gobo Spinner
                        </Navbar.Brand>
                        <Nav className="mb-auto">
                            <Nav.Link href="https://github.com/danielskeenan/gobospinner">
                                <FontAwesomeIcon icon={faGithub}/>&nbsp;Source
                            </Nav.Link>
                        </Nav>
                    </Container>
                </Navbar>

                <Container as="main">
                    <Flashes flashes={state.flashes}/>
                    {state.gobos === undefined && <Loading/>}
                    {state.gobos !== undefined && (
                        <>
                            <Row>
                                <Col>
                                    <Spinner stack={state.gobos} blur={goboBlur}/>
                                </Col>
                            </Row>

                            <Row className="align-items-center">
                                <Col xs="auto">
                                    <Form.Label>Blur:</Form.Label>
                                </Col>
                                <Col>
                                    <Form.Range min={appConfig.minBlur}
                                                max={appConfig.maxBlur}
                                                step={0.1}
                                                value={goboBlur}
                                                onChange={(e) => setGoboBlur(Number(e.target.value))}/>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <GoboStack gobos={state.gobos}/>
                                </Col>
                            </Row>

                            <Form.Group as={Row}>
                                <Form.Label column>Permalink:</Form.Label>
                                <Col xs="11">
                                    <Permalink stack={state.gobos} blur={goboBlur}/>
                                </Col>
                                {/*<div className="mt-3 d-flex align-items-center">*/}
                                {/*    <div className="me-1">Permalink:</div>*/}
                                {/*    <Permalink stack={state.gobos}/>*/}
                                {/*</div>*/}
                            </Form.Group>
                        </>
                    )}
                </Container>
            </AppContext.Provider>
        </div>
    );
}

export default App;
