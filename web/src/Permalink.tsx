import React from 'react';
import {Form} from 'react-bootstrap';
import {SpinningGobo} from './Spinner';
import {makeQuery} from './common/client';
import appConfig from './appConfig.json';

enum PermalinkParam {
    BLUR = 'blur',
    GOBO = 'gobo',
    REVERSE = 'reverse',
    SPEED = 'speed',
}

export default function Permalink(props: { stack: SpinningGobo[], blur: number }) {
    const {stack} = props;

    const url = new URL(document.location.href);
    for (const param in PermalinkParam) {
        url.searchParams.delete(PermalinkParam[param as keyof typeof PermalinkParam]);
    }
    url.searchParams.set(PermalinkParam.BLUR, String(props.blur));
    for (const gobo of stack) {
        url.searchParams.append(PermalinkParam.GOBO, String(gobo.gobo.id));
        url.searchParams.append(PermalinkParam.REVERSE, String(Number(gobo.reverseSpin)));
        url.searchParams.append(PermalinkParam.SPEED, String(gobo.duration));
    }

    return (
        <Form.Control type="text"
                      readOnly
                      value={url.toString()}
        />
    );
}

export function goboStackFromUrl(url: string = document.location.href): Promise<SpinningGobo[]> {
    const params = (new URL(url)).searchParams;
    const goboIds = params.getAll(PermalinkParam.GOBO);
    const reverse = params.getAll(PermalinkParam.REVERSE);
    const speeds = params.getAll(PermalinkParam.SPEED);
    if (![goboIds.length, reverse.length, speeds.length].every(length => goboIds.length === length)) {
        console.log('Malformed URL');
        return new Promise(() => []);
    }

    // All arrays are now guaranteed to be the same length.
    const promises = [];
    for (let index = 0; index < goboIds.length; ++index) {
        promises.push(makeQuery<ApiRecord.Gobo>(`gobos/${goboIds[index]}`)
            .then(response => {
                let duration = Number(speeds[index]);
                if (!Number.isFinite(duration) || duration < appConfig.minDuration || duration > appConfig.maxDuration) {
                    duration = appConfig.defaultDuration;
                }
                let reverseSpin = Number(reverse[index]);
                if (!Number.isFinite(reverseSpin)) {
                    reverseSpin = 0;
                }
                const spinningGobo: SpinningGobo = {
                    gobo: response.data,
                    duration: duration,
                    reverseSpin: Boolean(reverseSpin),
                };
                return spinningGobo;
            }));
    }
    return Promise.all(promises);
}

export function blurFromUrl(url: string = document.location.href): number {
    const params = (new URL(url)).searchParams;
    if (!params.has(PermalinkParam.BLUR)) {
        return appConfig.defaultBlur;
    }
    const blur = Number(params.get(PermalinkParam.BLUR));
    if (!Number.isFinite(blur) || blur < appConfig.minBlur || blur > appConfig.maxBlur) {
        console.log('Malformed URL');
        return appConfig.defaultBlur;
    }
    return blur;
}
