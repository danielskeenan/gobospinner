import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCircleNotch} from '@fortawesome/free-solid-svg-icons';
import {Alert} from 'react-bootstrap';
import React from 'react';

interface LoadingProps {
    label?: string | React.ReactElement
    uncontained?: boolean
}

function Throbber(props: Pick<LoadingProps, 'label'>) {
    const label = props.label ?? 'Loading...';

    return (
        <span>
            <FontAwesomeIcon icon={faCircleNotch} spin/>
            &nbsp;
            {label}
        </span>
    );
}

export default function Loading(props: Partial<LoadingProps>) {
    if (!(props.uncontained ?? false)) {
        return (
            <div>
                <Alert variant="secondary"><Throbber label={props.label}/></Alert>
            </div>
        );
    } else {
        return (<Throbber label={props.label}/>);
    }
}
