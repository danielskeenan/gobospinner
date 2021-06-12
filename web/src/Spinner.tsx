import React from 'react';
import {AssetPackage, getAssetUrl} from './common/getAssetUrl';
import './Spinner.scss';

export interface SpinningGobo {
    /** Gobo to spin */
    gobo: ApiRecord.Gobo
    /** Spin the gobo counter-clockwise */
    reverseSpin: boolean
    /** Number of milliseconds per complete rotation */
    duration: number
}

export default function Spinner(props: { stack: SpinningGobo[], blur: number }) {
    const stack = props.stack.slice();

    // The stack must be sorted to place the steel gobos at the top.
    stack.sort((a, b) => Number(b.gobo.adjustOpacity) - Number(a.gobo.adjustOpacity));

    const opacity = calcOpacityOverride(stack);

    return (
        <div className="mts-spinner-gobos">
            {stack.map((gobo, index) => (
                <img key={`${gobo.gobo['@id']}-${index}`}
                     src={getAssetUrl(`${gobo.gobo.imageId}.png`, AssetPackage.GOBO)} alt=""
                     className="mts-gobo-image"
                     style={{
                         zIndex: index + 1,
                         opacity: gobo.gobo.adjustOpacity ? `${opacity}%` : '100%',
                         animationDuration: `${gobo.duration}ms`,
                         animationDirection: gobo.reverseSpin ? 'reverse' : 'normal',
                         filter: `blur(${props.blur}px)`,
                     }}
                />
            ))}
        </div>
    );
}

function calcOpacityOverride(stack: SpinningGobo[]): number {
    let adjustOpacityCount = 0;
    for (const gobo of stack) {
        if (gobo.gobo.adjustOpacity) {
            ++adjustOpacityCount;
        }
    }
    return 100.0 / adjustOpacityCount;
}
