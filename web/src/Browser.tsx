import React, {useCallback, useContext, useEffect, useMemo, useReducer} from 'react';
import {
    Column,
    TableInstance,
    TableOptions,
    TableState,
    useAsyncDebounce,
    usePagination,
    UsePaginationInstanceProps,
    UsePaginationOptions,
    UsePaginationState,
    useSortBy,
    UseSortByColumnOptions,
    UseSortByInstanceProps,
    UseSortByOptions,
    UseSortByState,
    useTable,
} from 'react-table';
import {makeQuery} from './common/client';
import AppContext, {AppContextProps} from './common/Context';
import {AxiosError} from 'axios';
import {FlashSeverity} from './common/components/Flashes';
import {Button, ButtonGroup, Card, Col, FloatingLabel, Form, Row, Tab, Tabs} from 'react-bootstrap';
import Loading from './common/components/Loading';
import {AssetPackage, getAssetUrl} from './common/getAssetUrl';
import './Browser.scss';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faAngleDoubleLeft, faAngleDoubleRight, faAngleLeft, faAngleRight} from '@fortawesome/free-solid-svg-icons';

type SelectCallback = (selection: ApiRecord.Gobo) => void;

interface BrowserProps {
    onSelect: SelectCallback,
    actionLabel: string
}

interface BrowserState {
    loading: boolean
    manufacturers: ApiRecord.Manufacturer[]
    filterName: string
    filterCode: string
}

export default function Browser(props: BrowserProps) {
    const {setFlashes} = useContext(AppContext) as Required<AppContextProps>;
    const [state, setState] = useReducer((state: BrowserState, newState: Partial<BrowserState>) => ({...state, ...newState}), {
        loading: false,
        filterName: '',
        filterCode: '',
    } as BrowserState);
    if (!state.loading && state.manufacturers === undefined) {
        setState({loading: true});
        makeQuery<ApiRecord.HydraCollection<ApiRecord.Manufacturer>>('manufacturers', {
            pagination: 0,
        }).then(response => {
            setState({
                loading: false,
                manufacturers: response.data['hydra:member'],
            });
        }).catch((error: AxiosError) => {
            console.log(error.message);
            setFlashes([{severity: FlashSeverity.DANGER, message: 'Error loading Manufacturers.'}]);
        });
    }

    if (state.loading) {
        return <Loading/>;
    }
    return (
        <div className="mts-goboselector">
            <Form>
                <Row>
                    <Col>
                        <FloatingLabel label="Code">
                            <Form.Control type="text"
                                          value={state.filterCode}
                                          onChange={(e) => setState({filterCode: e.target.value})}
                            />
                        </FloatingLabel>
                    </Col>
                    <Col>
                        <FloatingLabel label="Name">
                            <Form.Control type="text"
                                          value={state.filterName}
                                          onChange={(e) => setState({filterName: e.target.value})}
                            />
                        </FloatingLabel>
                    </Col>
                </Row>
            </Form>
            {(state.filterCode.length > 0 || state.filterName.length > 0) && (
                <NameFilteredGoboList onSelect={props.onSelect}
                                      actionLabel={props.actionLabel}
                                      code={state.filterCode}
                                      name={state.filterName}/>
            )}
            {state.filterCode.length === 0 && state.filterName.length === 0 && state.manufacturers !== undefined && (
                <Tabs>
                    {state.manufacturers.map(manufacturer => (
                        <Tab key={manufacturer['@id']} eventKey={manufacturer['@id']} title={manufacturer.name}>
                            <SeriesTab seriesId={manufacturer.id} onSelect={props.onSelect}
                                       actionLabel={props.actionLabel}/>
                        </Tab>
                    ))}
                </Tabs>
            )}
        </div>
    );
}

interface SeriesTabProps extends BrowserProps {
    seriesId: number,
}

interface SeriesTabState {
    loading: boolean
    materials: ApiRecord.Material[]
}

function SeriesTab(props: SeriesTabProps) {
    const {setFlashes} = useContext(AppContext) as Required<AppContextProps>;
    const [state, setState] = useReducer((state: SeriesTabState, newState: Partial<SeriesTabState>) => ({...state, ...newState}), {
        loading: false,
    } as SeriesTabState);
    if (!state.loading && state.materials === undefined) {
        makeQuery<ApiRecord.HydraCollection<ApiRecord.Material>>('materials', {
            pagination: 0,
        }).then(response => {
            setState({
                loading: false,
                materials: response.data['hydra:member'],
            });
        }).catch((error: AxiosError) => {
            console.log(error.message);
            setFlashes([{severity: FlashSeverity.DANGER, message: 'Error loading Materials.'}]);
        });
        setState({loading: true});
    }

    if (state.loading || state.materials === undefined) {
        return <Loading/>;
    }
    return (
        <Tabs>
            {state.materials.map(material => (
                <Tab key={material['@id']} eventKey={material['@id']} title={material.name}>
                    <MaterialTab seriesId={props.seriesId} materialId={material.id} onSelect={props.onSelect}
                                 actionLabel={props.actionLabel}/>
                </Tab>
            ))}
        </Tabs>
    );
}

type DataTableState<T extends object> = TableState<T>
    & UseSortByState<T>
    & UsePaginationState<T>;

type DataTableOptions<T extends object> = TableOptions<T>
    & UseSortByOptions<T>
    & UsePaginationOptions<T>
    & { initialState?: Partial<DataTableState<T>> };

type DataTableInstance<T extends object> = TableInstance<T>
    & UseSortByInstanceProps<T>
    & UsePaginationInstanceProps<T>
    & { state: DataTableState<T> };

type DataTableColumnOptions<T extends object> = Column<T>
    & UseSortByColumnOptions<T>;

enum SortDirection {
    ASC = 'asc',
    DESC = 'desc',
}

type SortBy = Record<string, SortDirection>;

interface FilteredGoboListState {
    gobos: ApiRecord.Gobo[]
    loading: boolean
    pageCount: number
}

interface NameFilteredGoboListProps extends Pick<BrowserProps, 'onSelect' | 'actionLabel'> {
    code: string
    name: string
}

interface NameFilteredGoboListState extends FilteredGoboListState {
    pageIndex: number
    loadedForCode?: string
    loadedForName?: string
}

function NameFilteredGoboList(props: NameFilteredGoboListProps) {
    const {setFlashes} = useContext(AppContext) as Required<AppContextProps>;
    const [state, setState] = useReducer((state: NameFilteredGoboListState, newState: Partial<NameFilteredGoboListState>) => ({...state, ...newState}), {
        pageIndex: 0,
        gobos: [],
        loading: false,
        pageCount: -1,
    } as NameFilteredGoboListState);

    const {code, name} = props;
    const dataFetcher = useCallback((newPageIndex: number, newPageSize: number, sortBy: SortBy) => {
        const params = Object.assign({
            code: code,
            name: name,
            page: newPageIndex + 1,
            itemsPerPage: newPageSize,
        }, buildOrderParams(sortBy, sortFieldMap));
        makeQuery<ApiRecord.HydraCollection<ApiRecord.Gobo>>('gobos', params)
            .then(response => {
                setState({
                    loading: false,
                    loadedForCode: code,
                    loadedForName: name,
                    pageIndex: newPageIndex,
                    gobos: response.data['hydra:member'],
                    pageCount: Math.ceil(response.data['hydra:totalItems'] / newPageSize),
                });
            })
            .catch((error: AxiosError) => {
                console.log(error.message);
                setFlashes([{severity: FlashSeverity.DANGER, message: 'Error loading Gobos.'}]);
            });
        setState({loading: true});
    }, [setFlashes, code, name]);

    return <GoboList dataFetcher={dataFetcher}
                     gobos={state.gobos}
                     loading={state.loading}
                     pageIndex={state.pageIndex}
                     pageCount={state.pageCount}
                     onSelect={props.onSelect}
                     actionLabel={props.actionLabel}
    />;
}

interface MaterialTabProps extends SeriesTabProps,
    Pick<BrowserProps, 'onSelect' | 'actionLabel'> {
    materialId: number
}

const sortFieldMap = {
    name: 'name',
    code: 'sortWeight',
};

function MaterialTab(props: MaterialTabProps) {
    const {setFlashes} = useContext(AppContext) as Required<AppContextProps>;
    const [state, setState] = useReducer((state: FilteredGoboListState, newState: Partial<FilteredGoboListState>) => ({...state, ...newState}), {
        gobos: [],
        loading: false,
        pageCount: -1,
    } as FilteredGoboListState);

    const dataFetcher = useCallback((newPageIndex: number, newPageSize: number, sortBy: SortBy) => {
        const params = Object.assign({
            material: props.materialId,
            manufacturer: props.seriesId,
            page: newPageIndex + 1,
            itemsPerPage: newPageSize,
        }, buildOrderParams(sortBy, sortFieldMap));
        makeQuery<ApiRecord.HydraCollection<ApiRecord.Gobo>>('gobos', params)
            .then(response => {
                setState({
                    loading: false,
                    gobos: response.data['hydra:member'],
                    pageCount: Math.ceil(response.data['hydra:totalItems'] / newPageSize),
                });
            })
            .catch((error: AxiosError) => {
                console.log(error.message);
                setFlashes([{severity: FlashSeverity.DANGER, message: 'Error loading Gobos.'}]);
            });
        setState({loading: true});
    }, [setFlashes, props.materialId, props.seriesId]);

    return <GoboList dataFetcher={dataFetcher}
                     gobos={state.gobos}
                     loading={state.loading}
                     pageCount={state.pageCount}
                     onSelect={props.onSelect}
                     actionLabel={props.actionLabel}
    />;
}

type FetchDataCallback = (pageIndex: number, pageSize: number, sortBy: SortBy) => void;

interface GoboListProps extends Pick<SeriesTabProps, 'onSelect' | 'actionLabel'> {
    dataFetcher: FetchDataCallback
    gobos: ApiRecord.Gobo[]
    loading: boolean
    pageCount: number
    pageIndex?: number
}

function GoboList(props: GoboListProps) {
    // Configure the display
    const columns: DataTableColumnOptions<ApiRecord.Gobo>[] = useMemo(() => [
        {
            Header: 'Name',
            accessor: 'name',
        },
        {
            Header: 'Code',
            accessor: 'code',
        },
        {
            Header: 'Image',
            accessor: 'imageId',
        },
    ], []);
    const tableOptions: DataTableOptions<ApiRecord.Gobo> = {
        columns: columns,
        data: props.gobos,
        pageCount: props.pageCount,
        manualPagination: true,
        manualSortBy: true,
        initialState: {
            pageIndex: props.pageIndex ?? 0,
            pageSize: 10,
            sortBy: [{id: 'code'}],
        },
    };
    const {
        // Table
        prepareRow,
        // Pagination
        page,
        canPreviousPage,
        canNextPage,
        pageCount,
        gotoPage,
        nextPage,
        previousPage,
        state: tableState,
    } = useTable(tableOptions,
        useSortBy,
        usePagination) as DataTableInstance<ApiRecord.Gobo>;
    const {pageIndex, pageSize, sortBy} = tableState as DataTableState<ApiRecord.Gobo>;

    // Load data
    const sortMap = useMemo(() => {
        const sorts: SortBy = {};
        for (const sort of sortBy) {
            sorts[sort.id] = sort.desc ? SortDirection.DESC : SortDirection.ASC;
        }
        return sorts;
    }, [sortBy]);
    const {dataFetcher} = props;
    // Reset if needed
    useEffect(() => gotoPage(0), [dataFetcher, gotoPage]);
    const fetchDataDebounced = useAsyncDebounce(() => dataFetcher && dataFetcher(pageIndex, pageSize, sortMap), 100);
    useEffect(fetchDataDebounced, [fetchDataDebounced, pageIndex, pageSize, sortBy, dataFetcher]);

    if (props.loading) {
        return <Loading/>;
    }

    function Controls() {
        return (
            <Form className="mts-goboselector-controls">
                <Row className="align-items-center">
                    {/* Page size selector */}
                    {/*<Form.Group as={Col} sm>*/}
                    {/*    <Form.Label htmlFor="rowsPerPage">Rows per page</Form.Label>*/}
                    {/*    <Form.Control*/}
                    {/*        as="select"*/}
                    {/*        name="rowsPerPage"*/}
                    {/*        value={pageSize}*/}
                    {/*        onChange={e => setPageSize(Number(e.target.value))}*/}
                    {/*    >*/}
                    {/*        {[10, 25, 50, 100].map(page_size =>*/}
                    {/*            <option key={page_size}*/}
                    {/*                    value={page_size}>{page_size}</option>)}*/}
                    {/*    </Form.Control>*/}
                    {/*</Form.Group>*/}

                    {/* Page selector */}
                    {/*<Form.Group as={Col} sm>*/}
                    {/*    <Form.Label htmlFor="page">Go to page</Form.Label>*/}
                    {/*    <Form.Control*/}
                    {/*        as="select"*/}
                    {/*        value={pageIndex}*/}
                    {/*        onChange={e => gotoPage(Number(e.target.value))}*/}
                    {/*    >*/}
                    {/*        {pageOptions.map(pageNum =>*/}
                    {/*            <option key={pageNum} value={pageNum}>{pageNum + 1}</option>)}*/}
                    {/*    </Form.Control>*/}
                    {/*</Form.Group>*/}

                    {/* Next/previous buttons */}
                    <Form.Group as={Col} md>
                        <ButtonGroup>
                            {/* First page */}
                            <Button
                                variant="secondary"
                                title="First page"
                                disabled={!canPreviousPage}
                                onClick={() => gotoPage(0)}
                            >
                                <FontAwesomeIcon icon={faAngleDoubleLeft}/>
                            </Button>
                            {/* Previous page */}
                            <Button
                                variant="secondary"
                                title="Previous page"
                                disabled={!canPreviousPage}
                                onClick={() => previousPage()}
                            >
                                <FontAwesomeIcon icon={faAngleLeft}/>
                            </Button>
                            {/* Current page */}
                            <Button
                                variant="outline-secondary"
                                disabled
                            >
                                {pageIndex + 1} / {pageCount}
                            </Button>
                            {/* Next page */}
                            <Button
                                variant="secondary"
                                title="Next page"
                                disabled={!canNextPage}
                                onClick={() => nextPage()}
                            >
                                <FontAwesomeIcon icon={faAngleRight}/>
                            </Button>
                            {/* Last page */}
                            <Button
                                variant="secondary"
                                title="Last page"
                                disabled={!canNextPage}
                                onClick={() => gotoPage(pageCount - 1)}
                            >
                                <FontAwesomeIcon icon={faAngleDoubleRight}/>
                            </Button>
                        </ButtonGroup>
                    </Form.Group>
                </Row>
            </Form>
        );
    }

    if (page.length === 0) {
        return <p>No gobos found.</p>;
    }

    return (
        <div>
            <Controls/>
            <div className="mts-goboselector-list" role="list">
                {page.map(row => {
                    prepareRow(row);
                    return (
                        <Card key={row.original['@id']} className="mts-goboselector-gobo" role="listitem">
                            <Card.Img variant="top"
                                      className="mts-gobo-image"
                                      src={getAssetUrl(`${row.values.imageId}.png`, AssetPackage.GOBO)}
                                      alt=""/>
                            <Card.Body>
                                <Card.Title className="mts-gobo-code">{row.values.code}</Card.Title>
                                <Card.Text className="mts-gobo-name">{row.values.name}</Card.Text>
                            </Card.Body>
                            <Card.Footer>
                                <div className="d-grid">
                                    <Button variant="secondary" onClick={() => props.onSelect(row.original)}>
                                        {props.actionLabel}
                                    </Button>
                                </div>
                            </Card.Footer>
                        </Card>
                    );
                })}
            </div>
            <Controls/>
        </div>
    );
}

/**
 * Build an object of parameters from the provided sorts.
 * @param sortBy
 * @param sortFieldMap Map column ids from sortBy to the field to sort with
 * @param param The sorting parameter name.  Defaults to `order`, the API Platform default.
 */
function buildOrderParams(sortBy: SortBy, sortFieldMap: Record<string, string> = {}, param: string = 'order') {
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(sortBy)) {
        const sortField = sortFieldMap[k] ?? k;
        params[`${param}[${sortField}]`] = v.valueOf();
    }

    return params;
}
