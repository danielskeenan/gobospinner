import React, {useCallback, useContext, useState} from 'react';
import {Button, ButtonGroup, Col, Form, Modal, Row, Table} from 'react-bootstrap';
import {AssetPackage, getAssetUrl} from './common/getAssetUrl';
import AppContext, {AppContextProps} from './common/Context';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCaretDown, faCaretUp, faMinus, faPlus} from '@fortawesome/free-solid-svg-icons';
import Browser from './Browser';
import './GoboStack.scss';
import {SpinningGobo} from './Spinner';
import appConfig from './appConfig.json';

export default function GoboStack(props: { gobos: SpinningGobo[] }) {
    const {setGobos} = useContext(AppContext) as Required<AppContextProps>;
    const {gobos} = props;

    const [browserVisible, setBrowserVisible] = useState(false);
    const showBrowser = useCallback(() => setBrowserVisible(true), [setBrowserVisible]);
    const hideBrowser = useCallback(() => setBrowserVisible(false), [setBrowserVisible]);

    const goboAddedCallback = useCallback((gobo: ApiRecord.Gobo) => {
        const spinningGobo: SpinningGobo = {
            gobo: gobo,
            reverseSpin: false,
            duration: appConfig.defaultDuration,
        };
        gobos.push(spinningGobo);
        setGobos(gobos);
    }, [setGobos, gobos]);
    const goboDirectionChangedCallback = useCallback((index: number, reverseSpin: boolean) => {
        gobos[index].reverseSpin = reverseSpin;
        setGobos(gobos);
    }, [setGobos, gobos]);
    const goboSpeedChangedCallback = useCallback((index: number, duration: number) => {
        gobos[index].duration = Math.max(1, duration);
        setGobos(gobos);
    }, [setGobos, gobos]);
    const goboChangeOrderCallback = useCallback((oldIndex: number, newIndex: number) => {
        const gobo = gobos.splice(oldIndex, 1)[0];
        gobos.splice(newIndex, 0, gobo);
        setGobos(gobos);
    }, [setGobos, gobos]);
    const goboRemoveCallback = useCallback((index: number) => {
        gobos.splice(index, 1);
        setGobos(gobos);
    }, [setGobos, gobos]);

    return (
        <>
            <div>
                {gobos.length > 0 && (
                    <Table responsive="sm" className="mts-gobostack">
                        <thead>
                        <tr>
                            <th>Gobo</th>
                            <th>Code</th>
                            <th>Name</th>
                        </tr>
                        </thead>
                        {gobos.map((gobo, index) => (
                            <tbody key={gobo.gobo['@id']}>
                            <tr>
                                <td className="mts-gobo-image">
                                    <img src={getAssetUrl(`${gobo.gobo.imageId}.png`, AssetPackage.GOBO)} alt=""/>
                                </td>
                                <td className="mts-gobo-code">
                                    {gobo.gobo.code}
                                </td>
                                <td className="mts-gobo-name">
                                    {gobo.gobo.name}
                                </td>
                            </tr>
                            <tr>
                                <td colSpan={3}>
                                    <Form>
                                        <Row>
                                            <Col sm={2}>
                                                <ButtonGroup>
                                                    <Button variant="outline-secondary"
                                                            title="Move up"
                                                            disabled={index === 0}
                                                            onClick={() => goboChangeOrderCallback(index, index - 1)}>
                                                        <FontAwesomeIcon icon={faCaretUp}/>
                                                    </Button>
                                                    <Button variant="outline-secondary"
                                                            title="Move down"
                                                            disabled={index === gobos.length - 1}
                                                            onClick={() => goboChangeOrderCallback(index, index + 1)}>
                                                        <FontAwesomeIcon icon={faCaretDown}/>
                                                    </Button>
                                                    <Button variant="outline-danger"
                                                            title="Remove"
                                                            onClick={() => goboRemoveCallback(index)}>
                                                        <FontAwesomeIcon icon={faMinus}/>
                                                    </Button>
                                                </ButtonGroup>
                                            </Col>
                                            <Col sm={2}>
                                                <Form.Check type="radio"
                                                            inline
                                                            name="direction"
                                                            label="CW"
                                                            checked={!gobo.reverseSpin}
                                                            onChange={e => goboDirectionChangedCallback(index, !e.target.checked)}
                                                />
                                                <Form.Check type="radio"
                                                            inline
                                                            name="direction"
                                                            label="CCW"
                                                            checked={gobo.reverseSpin}
                                                            onChange={e => goboDirectionChangedCallback(index, e.target.checked)}
                                                />
                                            </Col>
                                            <Col>
                                                <Form.Range min={appConfig.minDuration}
                                                            max={appConfig.maxDuration}
                                                            step={10}
                                                            value={calculateDurationFromSpeed(gobo.duration)}
                                                            onChange={e => goboSpeedChangedCallback(index, calculateDurationFromSpeed(Number(e.target.value)))}
                                                />
                                            </Col>
                                        </Row>
                                    </Form>
                                </td>
                            </tr>
                            </tbody>
                        ))}
                    </Table>
                )}
                <Button variant="outline-success" onClick={showBrowser}>
                    <FontAwesomeIcon icon={faPlus}/>&nbsp;Add
                </Button>
            </div>

            {/* Gobo browser */}
            <Modal size="lg" show={browserVisible} onHide={hideBrowser}>
                <Modal.Header closeButton>
                    <Modal.Title>Gobo Browser</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Browser onSelect={goboAddedCallback} actionLabel="Add"/>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="outline-danger" onClick={hideBrowser}>Close</Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

function calculateDurationFromSpeed(speed: number): number {
    return appConfig.maxDuration - speed;
}
