namespace ApiRecord {
    type Record = Record<string, any>;

    interface Entity extends ApiRecord.Record {
        '@id': string
        id: number
    }

    interface HydraCollection<T> extends Record {
        'hydra:member': Array<T>
        'hydra:totalItems': number
        'hydra:view': {
            'hydra:first'?: string
            'hydra:last'?: string
            'hydra:next'?: string
        }
    }

    interface Gobo extends Entity {
        manufacturer: string
        material: string
        name: string
        code: string
        imageId: string
        sortWeight: number
        /** These gobos do not have transparent portions.  Instead, adjust opacity when stacked. */
        adjustOpacity: boolean
    }

    interface Manufacturer extends Entity {
        name: string
    }

    interface Material extends Entity {
        name: string
    }
}
