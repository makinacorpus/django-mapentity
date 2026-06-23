import { MapLibreEvent, MapMouseEvent, MapTouchEvent, LineLayerSpecification, FillLayerSpecification, CircleLayerSpecification, SymbolLayerSpecification } from 'maplibre-gl';
import { GeoJSON, Feature, LineString, MultiLineString, Position, Point, MultiPoint, Polygon, MultiPolygon, FeatureCollection, BBox, GeoJsonProperties } from 'geojson';
import { PartialDeep } from 'type-fest';

declare const GM_PREFIX: "gm";
declare const GM_SYSTEM_PREFIX: "_gm";
declare const IS_PRO: boolean;

type BaseMapEvent = MapLibreEvent;
type BaseMapPointerEvent = MapMouseEvent | MapTouchEvent;

type EventsMap = Record<`${typeof GM_SYSTEM_PREFIX}:draw`, GmDrawEvent> & Record<`${typeof GM_SYSTEM_PREFIX}:edit`, GmEditEvent> & Record<`${typeof GM_SYSTEM_PREFIX}:helper`, GmHelperEvent> & Record<`${typeof GM_SYSTEM_PREFIX}:control`, GmControlEvent> & Record<`${typeof GM_PREFIX}:globaldrawmodetoggled`, GlobalDrawToggledFwdEvent> & Record<`${typeof GM_PREFIX}:drawstart`, GlobalDrawEnabledDisabledFwdEvent> & Record<`${typeof GM_PREFIX}:drawend`, GlobalDrawEnabledDisabledFwdEvent> & Record<`${typeof GM_PREFIX}:global${FwdEditModeName}modetoggled`, GlobalEditToggledFwdEvent> & Record<`${typeof GM_PREFIX}:global${HelperModeName}modetoggled`, GlobalHelperToggledFwdEvent> & Record<`${typeof GM_PREFIX}:create`, FeatureCreatedFwdEvent> & Record<`${typeof GM_PREFIX}:remove`, FeatureRemovedFwdEvent> & Record<`${typeof GM_PREFIX}:${FwdEditModeName}`, FeatureUpdatedFwdEvent> & Record<`${typeof GM_PREFIX}:${FwdEditModeName}start`, FeatureEditStartFwdEvent> & Record<`${typeof GM_PREFIX}:${FwdEditModeName}end`, FeatureEditEndFwdEvent> & Record<`${typeof GM_PREFIX}:${GmControlLoadEvent['action']}`, GmLoadStateFwdEvent>;
type EventFor<T extends string> = T extends keyof EventsMap ? EventsMap[T] : GmSystemEvent | GmEvent | BaseMapEvent;

declare const FEATURE_PROPERTY_PREFIX: "__gm_";
declare const FEATURE_ID_PROPERTY: "__gm_id";
declare const SOURCES: {
    [key: string]: string;
};

declare abstract class BaseSource<TSourceInstance = unknown> {
    abstract sourceInstance: TSourceInstance | null;
    abstract get id(): string;
    abstract get loaded(): boolean;
    abstract createSource({ geoJson, sourceId, }: {
        sourceId: string;
        geoJson: GeoJSON;
    }): TSourceInstance;
    abstract getGeoJson(): GeoJsonShapeFeatureCollection;
    abstract getGmGeoJson(): GeoJsonShapeFeatureCollection;
    abstract setData(geoJson: GeoJSON): Promise<void>;
    abstract updateData(updateStorage: GeoJsonUniversalDiff): Promise<void>;
    abstract remove(): void;
    isInstanceAvailable(): this is {
        sourceInstance: TSourceInstance;
    };
}

declare class FeatureData {
    gm: Geoman;
    id: FeatureId;
    parent: FeatureData | null;
    markers: Map<MarkerId, MarkerData>;
    source: BaseSource;
    _geoJson: GeoJsonShapeFeature | null;
    constructor(parameters: FeatureDataParameters);
    get shape(): FeatureShape;
    set shape(shape: FeatureShape);
    get temporary(): boolean;
    get sourceName(): FeatureSourceName;
    getShapeProperty<T extends keyof FeatureShapeProperties>(name: T, inputGeoJson?: GeoJsonShapeFeature): FeatureShapeProperties[T] | undefined;
    setShapeProperty<T extends keyof FeatureShapeProperties>(name: T, value: ShapeGeoJsonProperties[`${typeof FEATURE_PROPERTY_PREFIX}${T}`]): void;
    deleteShapeProperty<T extends keyof FeatureShapeProperties>(name: T): void;
    parseGmShapeProperties(geoJson: GeoJsonShapeFeature): PrefixedFeatureShapeProperties;
    parseExtraProperties(geoJson: GeoJsonShapeFeature): ShapeGeoJsonProperties;
    getGeoJson(): GeoJsonShapeFeature;
    addGeoJson(geoJson: GeoJsonShapeFeature): void;
    removeGeoJson(): void;
    removeMarkers(): void;
    /**
     * Updates the geometry of this feature.
     *
     * @param geometry - The new geometry for the feature
     *
     * @example
     * // Update a marker's position
     * feature.updateGeometry({ type: 'Point', coordinates: [10, 52] });
     *
     * // Update a polygon's coordinates
     * feature.updateGeometry({
     *   type: 'Polygon',
     *   coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
     * });
     */
    updateGeometry(geometry: BasicGeometry): void;
    /**
     * @deprecated Use `updateGeometry()` instead.
     */
    updateGeoJsonGeometry(geometry: BasicGeometry): void;
    /**
     * Updates custom properties on this feature. Properties are merged with existing ones.
     * Set a property value to `undefined` to delete it.
     *
     * Internal Geoman properties (prefixed with `gm_`) cannot be modified through this method
     * and will be preserved.
     *
     * @param properties - Object containing properties to update or delete (set to undefined)
     *
     * @example
     * // Add or update properties
     * feature.updateProperties({ color: 'red', size: 10 });
     *
     * // Delete a property
     * feature.updateProperties({ color: undefined });
     *
     * // Mix of updates and deletions
     * feature.updateProperties({ color: 'blue', oldProp: undefined });
     */
    updateProperties(properties: Record<string, unknown>): void;
    /**
     * Replaces all custom properties on this feature. Existing custom properties are removed
     * and replaced with the provided ones.
     *
     * Internal Geoman properties (prefixed with `gm_`) cannot be modified and will be preserved.
     *
     * @param properties - Object containing the new properties (replaces all existing custom properties)
     *
     * @example
     * // Replace all custom properties
     * feature.setProperties({ name: 'New Feature', category: 'poi' });
     */
    setProperties(properties: Record<string, unknown>): void;
    /**
     * Internal method to update all properties including Geoman system properties.
     * This should only be used by internal Geoman code (edit modes, draw modes, etc.).
     *
     * @internal
     * @param properties - Properties to merge with existing ones
     */
    _updateAllProperties(properties: Partial<ShapeGeoJsonProperties>): void;
    /**
     * @deprecated Use `updateProperties()` instead. Set property value to `undefined` to delete it.
     */
    updateGeoJsonProperties(properties: Partial<ShapeGeoJsonProperties>): void;
    /**
     * @deprecated Use `setProperties()` instead.
     */
    setGeoJsonCustomProperties(properties: Feature['properties']): void;
    /**
     * @deprecated Use `updateProperties()` instead.
     */
    updateGeoJsonCustomProperties(properties: Feature['properties']): void;
    /**
     * @deprecated Use `updateProperties({ propName: undefined })` instead.
     */
    deleteGeoJsonCustomProperties(fieldNames: Array<string>): void;
    convertToPolygon(): boolean;
    isConvertableToPolygon(): boolean;
    changeSource({ sourceName, atomic }: {
        sourceName: FeatureSourceName;
        atomic: boolean;
    }): void;
    fireFeatureUpdatedEvent({ mode }: {
        mode: EditModeName;
    }): void;
    delete(): void;
}

declare abstract class BaseDomMarker<TMarkerInstance = unknown> {
    abstract markerInstance: TMarkerInstance | null;
    abstract getElement(): HTMLElement | null;
    abstract setLngLat(lngLat: LngLatTuple): void;
    abstract getLngLat(): LngLatTuple;
    abstract remove(): void;
    isMarkerInstanceAvailable(): this is {
        markerInstance: TMarkerInstance;
    };
}

declare abstract class BaseHelper extends BaseAction {
    actionType: ActionType;
    abstract mode: HelperModeName;
}

type ShapeSnappingHandler = (featureData: FeatureData, lngLat: LngLatTuple, point: ScreenPoint) => {
    lngLat: LngLatTuple;
    distance: number;
};
declare class SnappingHelper extends BaseHelper {
    mode: HelperModeName;
    tolerance: number;
    lineSnappingShapes: ReadonlyArray<FeatureShape>;
    eventHandlers: {};
    shapeSnappingHandlers: {
        [key in FeatureShape]?: ShapeSnappingHandler;
    };
    private excludedFeature;
    private customSnappingLngLats;
    private customSnappingFeatures;
    onStartAction(): void;
    onEndAction(): void;
    addExcludedFeature(featureData: FeatureData): void;
    clearExcludedFeatures(): void;
    addCustomSnappingFeature(featureData: FeatureData): void;
    removeCustomSnappingFeature(featureData: FeatureData): void;
    clearCustomSnappingFeature(): void;
    setCustomSnappingCoordinates(sectionKey: string, lngLats: Array<LngLatTuple>): void;
    clearCustomSnappingCoordinates(sectionKey: string): void;
    getSnappedLngLat(lngLat: LngLatTuple, point: ScreenPoint): LngLatTuple;
    getCustomLngLatsSnapping(point: ScreenPoint): LngLatTuple | null;
    getFeaturePointsSnapping(features: Array<FeatureData>, lngLat: LngLatTuple, point: ScreenPoint): LngLatTuple | null;
    getFeatureLinesSnapping(features: Array<FeatureData>, lngLat: LngLatTuple, point: ScreenPoint): LngLatTuple | null;
    getFeaturesInPointBounds(point: ScreenPoint): Array<FeatureData>;
    getPointsSnapping(featureData: FeatureData, lngLat: LngLatTuple, point: ScreenPoint): ReturnType<ShapeSnappingHandler>;
    getLineSnapping(featureData: FeatureData, lngLat: LngLatTuple, point: ScreenPoint): ReturnType<ShapeSnappingHandler>;
    getNearestLinePointData(lineGeoJson: Feature<LineString | MultiLineString>, lngLat: LngLatTuple, point: ScreenPoint): {
        lngLat: LngLatTuple;
        distance: number;
    };
}

declare abstract class BaseAction {
    gm: Geoman;
    abstract actionType: ActionType;
    abstract mode: ModeName;
    options: ActionOptions;
    settings: ActionSettings;
    actions: SubActions;
    flags: {
        featureCreateAllowed: boolean;
        featureUpdateAllowed: boolean;
        actionInProgress: boolean;
    };
    abstract eventHandlers: EventHandlers;
    internalEventHandlers: EventHandlers;
    constructor(gm: Geoman);
    get snappingHelper(): SnappingHelper | null;
    abstract onStartAction(): void;
    abstract onEndAction(): void;
    startAction(): void;
    endAction(): void;
    getOptionValue(name: string): string | number | boolean | ChoiceItem | undefined;
    getSettingValue(name: string): ActionSetting;
    applyOptionValue(name: string, value: boolean | string | number): void;
    handleHelperEvent(event: GmGeofencingViolationEvent): {
        next: boolean;
    };
    handleGeofencingViolationEvent(event: GmGeofencingViolationEvent): {
        next: boolean;
    };
}

declare abstract class BaseDraw extends BaseAction {
    actionType: ActionType;
    abstract mode: DrawModeName;
    shape: ShapeName | null;
    featureData: FeatureData | null;
    saveFeature(): void;
    removeTmpFeature(): void;
    fireBeforeFeatureCreate({ geoJsonFeatures, forceMode, }: {
        geoJsonFeatures: NonEmptyArray<GeoJsonShapeFeature>;
        forceMode?: EditModeName;
    }): void;
    fireMarkerPointerStartEvent(): void;
    fireMarkerPointerUpdateEvent(): void;
    fireMarkerPointerFinishEvent(): void;
    forwardLineDrawerEvent(payload: GmSystemEvent): {
        next: boolean;
    };
    fireStartEvent(featureData: FeatureData, markerData?: MarkerData | null): void;
    fireUpdateEvent(featureData: FeatureData, markerData?: MarkerData | null): void;
    fireFinishEvent(): void;
}

type DrawClassConstructor = new (gm: Geoman) => BaseDraw;
type DrawClassMap = {
    [K in DrawModeName]: DrawClassConstructor | null;
};
declare const drawClassMap: DrawClassMap;
declare const createDrawInstance: (gm: Geoman, shape: DrawModeName) => BaseDraw | null;

declare abstract class BaseEdit extends BaseAction {
    actionType: ActionType;
    abstract mode: EditModeName;
    featureData: FeatureData | null;
    cursorExcludedLayerIds: Array<string>;
    layerEventHandlersData: Array<{
        eventName: PointerEventName;
        layerId: string;
        callback: () => void;
    }>;
    startAction(): void;
    endAction(): void;
    setCursorToPointer(): void;
    setCursorToEmpty(): void;
    getFeatureByMouseEvent({ event, sourceNames, }: {
        event: BaseMapPointerEvent;
        sourceNames: Array<FeatureSourceName>;
    }): FeatureData | null;
    setEventsForLayers(eventName: PointerEventName, callback: () => void): void;
    clearEventsForLayers(): void;
    updateFeatureGeoJson({ featureData, featureGeoJson, forceMode, }: {
        featureData: FeatureData;
        featureGeoJson: GeoJsonShapeFeature;
        forceMode?: EditModeName;
    }): boolean;
    fireBeforeFeatureUpdate({ features, geoJsonFeatures, forceMode, }: {
        features: NonEmptyArray<FeatureData>;
        geoJsonFeatures: NonEmptyArray<GeoJsonShapeFeature>;
        forceMode?: EditModeName;
    }): void;
    fireFeatureUpdatedEvent({ sourceFeatures, targetFeatures, markerData, forceMode, }: {
        sourceFeatures: NonEmptyArray<FeatureData>;
        targetFeatures: NonEmptyArray<FeatureData>;
        markerData?: MarkerData;
        forceMode?: EditModeName;
    }): void;
    fireFeatureEditStartEvent({ feature, forceMode, }: {
        feature: FeatureData;
        forceMode?: EditModeName;
    }): void;
    fireFeatureEditEndEvent({ feature, forceMode, }: {
        feature: FeatureData;
        forceMode?: EditModeName;
    }): void;
    fireMarkerPointerUpdateEvent(): void;
    forwardLineDrawerEvent(payload: GmSystemEvent): {
        next: boolean;
    };
    fireFeatureRemovedEvent(featureData: FeatureData): void;
    getLineDrawerMode(): DrawModeName;
}

type EditClassConstructor = new (gm: Geoman) => BaseEdit;
type EditClassMap = {
    [K in EditModeName]: EditClassConstructor | null;
};
declare const editClassMap: EditClassMap;
declare const createEditInstance: (gm: Geoman, mode: EditModeName) => BaseEdit | null;

type HelperClassConstructor = new (gm: Geoman) => BaseHelper;
type HelperClassMap = {
    [K in HelperModeName]: HelperClassConstructor | null;
};
declare const helperClassMap: HelperClassMap;
declare const createHelperInstance: (gm: Geoman, mode: HelperModeName) => BaseHelper | null;

declare const styles: {
    [key in FeatureShape]: LayerStyle;
};

declare const MODE_TYPES: readonly ["draw", "edit", "helper"];
declare const ACTION_TYPES: readonly ["draw", "edit", "helper", "control"];
declare const SHAPE_NAMES: readonly ["marker", "circle", "circle_marker", "ellipse", "text_marker", "line", "rectangle", "polygon"];
declare const EXTRA_DRAW_MODES: readonly ["freehand", "custom_shape"];
declare const DRAW_MODES: readonly ["marker", "circle", "circle_marker", "ellipse", "text_marker", "line", "rectangle", "polygon", "freehand", "custom_shape"];
declare const HELPER_MODES: readonly ["shape_markers", "pin", "snapping", "snap_guides", "measurements", "auto_trace", "geofencing", "zoom_to_features", "click_to_edit"];
declare const EDIT_MODES: readonly ["drag", "change", "rotate", "scale", "copy", "cut", "split", "union", "difference", "line_simplification", "lasso", "delete"];

type ModeType = (typeof MODE_TYPES)[number];
type ActionType = (typeof ACTION_TYPES)[number];
interface ControlOptions {
    title: string;
    icon: string | null;
    uiEnabled: boolean;
    active: boolean;
    options?: ActionOptions;
    settings?: ActionSettings;
    order?: number;
}
interface ControlStyles {
    controlGroupClass: string;
    controlContainerClass: string;
    controlButtonClass: string;
}
type GmOptionsData = {
    settings: {
        throttlingDelay: number;
        /**
         * When true, events like gm:create and gm:remove will wait for MapLibre
         * to commit data updates before firing. This ensures feature data is
         * accessible in event handlers via exportGeoJson().
         *
         * Set to false for faster async updates if you don't need immediate
         * data consistency in event handlers.
         *
         * @default true
         */
        awaitDataUpdatesOnEvents: boolean;
        useDefaultLayers: boolean;
        controlsPosition: BaseControlsPosition;
        controlsUiEnabledByDefault: boolean;
        controlsCollapsible: boolean;
        controlsStyles: ControlStyles;
        idGenerator: null | ((shapeGeoJson: GeoJsonShapeFeature) => string);
        markerIcons: {
            default: string;
            control: string;
        };
    };
    layerStyles: typeof styles;
    controls: {
        draw: {
            [key in DrawModeName]?: ControlOptions;
        };
        edit: {
            [key in EditModeName]?: ControlOptions;
        };
        helper: {
            [key in HelperModeName]?: ControlOptions;
        };
    };
};
type GmOptionsPartial = PartialDeep<GmOptionsData>;
type GenericControlsOptions = {
    [key in ModeName]?: ControlOptions;
};

type LineEventHandlerArguments = {
    markerIndex: number;
    shapeCoordinates: Array<Position>;
    geoJson: GeoJsonLineFeature;
    bounds: [LngLatTuple, LngLatTuple];
};

type ActionInstanceKey = `${ActionType}__${ModeName}`;
type ActionInstance = ReturnType<typeof createDrawInstance | typeof createEditInstance | typeof createHelperInstance>;
type ShapeName = (typeof SHAPE_NAMES)[number];
type DrawModeName = (typeof DRAW_MODES)[number];
type ExtraDrawModeName = (typeof EXTRA_DRAW_MODES)[number];
type EditModeName = (typeof EDIT_MODES)[number];
type HelperModeName = (typeof HELPER_MODES)[number];
type ChoiceItem = {
    title: string;
    value: boolean | string | number;
};
type SelectActionOption = {
    type: 'select';
    label: string;
    value: ChoiceItem;
    choices: Array<ChoiceItem>;
};
type ToggleActionOption = {
    type: 'toggle';
    label: string;
    value: boolean;
};
type HiddenActionOption = {
    type: 'hidden';
    value: string | boolean | number | undefined;
};
type SubAction = {
    label: string;
    method: () => void;
};
type ActionOption = SelectActionOption | ToggleActionOption | HiddenActionOption;
type ActionOptions = {
    [key: string]: ActionOption;
};
type SubActions = {
    [key: string]: SubAction;
};
type ActionSetting = boolean | string | null | undefined;
type ActionSettings = {
    [key: string]: ActionSetting;
};
type MarkerId = string;
interface DomMarkerData {
    type: 'dom';
    instance: BaseDomMarker;
    position: PositionData;
}
interface VertexMarkerData {
    type: 'vertex';
    instance: FeatureData;
    position: PositionData;
}
interface CenterMarkerData {
    type: 'center';
    instance: FeatureData;
    position: PositionData;
}
interface EdgeMarkerData {
    type: 'edge';
    instance: FeatureData;
    position: PositionData;
    segment: {
        start: PositionData;
        end: PositionData;
    };
}
type MarkerData = DomMarkerData | VertexMarkerData | CenterMarkerData | EdgeMarkerData;

declare abstract class BaseControl {
    gm: Geoman;
    constructor(gm: Geoman);
    abstract onAdd(): HTMLElement;
    abstract onRemove(): void;
}

declare class GMControl extends BaseControl {
    controls: SystemControls;
    reactiveControls: Record<string, unknown> | null;
    container: HTMLElement | undefined;
    eventHandlers: EventHandlers;
    onAdd(): HTMLElement;
    createControls(containerElement?: HTMLElement | undefined): void;
    onRemove(): void;
    handleModeEvent(event: GmBaseModeEvent): {
        next: boolean;
    };
    controlsAdded(): boolean;
    createReactivePanel(): void;
    updateReactivePanel(): void;
    createHtmlContainer(): HTMLDivElement;
    syncModeStates(): void;
    eachControlWithOptions(callback: ({ control, }: {
        control: GenericSystemControl;
        controlOptions: ControlOptions;
    }) => void): void;
    getControl({ modeType, modeName, }: {
        modeType: ModeType;
        modeName: ModeName;
    }): GenericSystemControl | null;
    getDefaultPosition(): BaseControlsPosition;
}

interface ControlSettings {
    exclusive: boolean;
    enabledBy?: Array<ModeName>;
}
interface SystemControl<AT extends ActionType, Mode> {
    readonly type: AT;
    readonly targetMode: Mode;
    readonly eventType: 'toggle' | 'click';
    readonly settings: ControlSettings;
}
interface SystemControls {
    readonly draw: Record<DrawModeName, SystemControl<'draw', DrawModeName>>;
    readonly edit: Record<EditModeName, SystemControl<'edit', EditModeName>>;
    readonly helper: Record<HelperModeName, SystemControl<'helper', HelperModeName>>;
}
type ModeName = DrawModeName | EditModeName | HelperModeName;
type GenericSystemControl = SystemControl<ModeType, ModeName>;
type GenericSystemControls = {
    [key in ModeName]?: GenericSystemControl;
};

declare const modeActions: readonly ["mode_start", "mode_started", "mode_end", "mode_ended"];
type ModeAction = (typeof modeActions)[number];
interface GmBaseModeEvent extends GmBaseEvent {
    action: ModeAction;
}

interface GmDrawModeEvent extends GmBaseModeEvent {
    name: `${GmSystemPrefix}:draw:mode`;
    actionType: 'draw';
    mode: DrawModeName;
}
interface GmDrawShapeEvent extends GmBaseEvent {
    name: `${GmSystemPrefix}:draw:shape`;
    actionType: 'draw';
    mode: DrawModeName;
    variant: null;
    action: 'finish' | 'cancel';
}
interface GmDrawShapeEventWithData extends GmBaseEvent {
    name: `${GmSystemPrefix}:draw:shape_with_data`;
    actionType: 'draw';
    mode: DrawModeName;
    variant: null;
    action: 'start' | 'update' | 'finish';
    markerData: MarkerData | null;
    featureData: FeatureData | null;
}
interface GmDrawFeatureCreatedEvent extends GmBaseEvent {
    name: `${GmSystemPrefix}:draw:feature_created`;
    actionType: 'draw';
    mode: DrawModeName;
    action: 'feature_created';
    featureData: FeatureData;
}
type GmDrawLineDrawerEvent = Omit<GmDrawShapeEvent, 'mode' | 'variant'> & {
    mode: 'line';
    variant: 'line_drawer';
};
type GmDrawFreehandDrawerEvent = Omit<GmDrawShapeEvent, 'mode' | 'variant'> & {
    mode: 'line' | 'polygon';
    variant: 'freehand_drawer';
};
type GmDrawLineDrawerEventWithData = Omit<GmDrawShapeEventWithData, 'mode' | 'variant'> & {
    mode: 'line';
    variant: 'line_drawer';
    geoJsonFeature?: GeoJsonLineFeature;
};
type GmDrawFreehandDrawerEventWithData = Omit<GmDrawShapeEventWithData, 'mode' | 'variant'> & {
    mode: 'line' | 'polygon';
    variant: 'freehand_drawer';
};
type GmDrawEvent = GmDrawModeEvent | GmDrawShapeEvent | GmDrawShapeEventWithData | GmDrawLineDrawerEvent | GmDrawLineDrawerEventWithData | GmDrawFreehandDrawerEvent | GmDrawFreehandDrawerEventWithData | GmDrawFeatureCreatedEvent;

interface GmEditModeEvent extends GmBaseModeEvent {
    name: `${GmSystemPrefix}:edit:mode`;
    actionType: 'edit';
    mode: EditModeName;
}
interface GmEditMarkerMoveEvent extends GmBaseEvent {
    name: `${GmSystemPrefix}:edit:marker_move`;
    actionType: 'edit';
    mode: EditModeName;
    action: 'marker_move';
    featureData: FeatureData;
    markerData: MarkerData;
    lngLatStart: LngLatTuple;
    lngLatEnd: LngLatTuple;
}
interface GmEditMarkerEvent extends GmBaseEvent {
    name: `${GmSystemPrefix}:edit:marker`;
    actionType: 'edit';
    mode: EditModeName;
    action: 'edge_marker_click' | 'marker_right_click' | 'marker_captured' | 'marker_released';
    featureData: FeatureData;
    markerData: MarkerData;
}
interface GmEditFeatureRemovedEvent extends GmBaseEvent {
    name: `${GmSystemPrefix}:edit:feature_removed`;
    actionType: 'edit';
    mode: DrawModeName;
    action: 'feature_removed';
    featureData: FeatureData;
}
interface GmEditFeatureUpdatedEvent extends GmBaseEvent {
    name: `${GmSystemPrefix}:edit:feature_updated`;
    actionType: 'edit';
    mode: EditModeName;
    action: 'feature_updated';
    sourceFeatures: NonEmptyArray<FeatureData>;
    targetFeatures: NonEmptyArray<FeatureData>;
    markerData: MarkerData | null;
}
interface GmEditFeatureEditStartEvent extends GmBaseEvent {
    name: `${GmSystemPrefix}:edit:feature_edit_start`;
    actionType: 'edit';
    mode: EditModeName;
    action: 'feature_edit_start';
    feature: FeatureData;
}
interface GmEditFeatureEditEndEvent extends GmBaseEvent {
    name: `${GmSystemPrefix}:edit:feature_edit_end`;
    actionType: 'edit';
    mode: EditModeName;
    action: 'feature_edit_end';
    feature: FeatureData;
}
type GmEditEvent = GmEditModeEvent | GmEditMarkerEvent | GmEditMarkerMoveEvent | GmEditFeatureUpdatedEvent | GmEditFeatureEditStartEvent | GmEditFeatureEditEndEvent | GmEditFeatureRemovedEvent;

interface GmFeatureBeforeCreateEvent extends GmBaseEvent {
    name: `${GmSystemPrefix}:feature:before_create`;
    actionType: 'draw';
    mode: ModeName;
    action: 'before_create';
    geoJsonFeatures: NonEmptyArray<GeoJsonShapeFeature>;
}
interface GmFeatureBeforeUpdateEvent extends GmBaseEvent {
    name: `${GmSystemPrefix}:feature:before_update`;
    actionType: 'edit';
    mode: ModeName;
    action: 'before_update';
    features: NonEmptyArray<FeatureData>;
    geoJsonFeatures: NonEmptyArray<GeoJsonShapeFeature>;
}
type GmFeatureEvent = GmFeatureBeforeUpdateEvent | GmFeatureBeforeCreateEvent;

interface GmHelperModeEvent extends GmBaseModeEvent {
    name: `${GmSystemPrefix}:helper:mode`;
    actionType: 'helper';
    mode: HelperModeName;
}
declare const geofencingViolationActions: readonly ["intersection_violation", "containment_violation"];
interface GmGeofencingViolationEvent extends GmBaseEvent {
    name: `${GmSystemPrefix}:helper:geofencing_violation`;
    mode: 'geofencing';
    actionType: 'draw' | 'edit';
    action: (typeof geofencingViolationActions)[number];
}
type GmHelperEvent = GmHelperModeEvent | GmGeofencingViolationEvent;

type MapHandlerReturnData = {
    next: boolean;
};
type MapEventHadler = (event: BaseMapEvent) => MapHandlerReturnData;
type GmEventHadler = (event: GmSystemEvent) => MapHandlerReturnData;
type EventHandlers = {
    [key in AnyEventName]?: GmEventHadler | MapEventHadler;
};
type MapEventHandlersWithControl = {
    [key in MapEventName]?: {
        controlHandler: (event: GmSystemEvent | GmEvent | BaseMapEvent) => void;
        handlers: Array<GmEventHadler | MapEventHadler>;
    };
};
type GmEventHandlersWithControl = {
    [key in GmEventName]?: {
        controlHandler: (event: GmSystemEvent | GmEvent | BaseMapEvent) => void;
        handlers: Array<GmEventHadler | MapEventHadler>;
    };
};
type EventControls = GmEventHandlersWithControl[GmEventName] | MapEventHandlersWithControl[MapEventName];

declare const isGmFeatureBeforeCreateEvent: (payload: unknown) => payload is GmFeatureBeforeCreateEvent;
declare const isGmFeatureBeforeUpdateEvent: (payload: unknown) => payload is GmFeatureBeforeUpdateEvent;

type EventLevel = 'system' | 'user';
type NonEmptyArray<T> = [T, ...T[]];
type GmBaseEvent = {
    level: EventLevel;
    name: string;
    actionType: ActionType;
    action: string;
};
type GmSystemEvent = GmDrawEvent | GmEditEvent | GmHelperEvent | GmControlEvent | GmFeatureEvent;
type GmPrefix = typeof GM_PREFIX;
type GmSystemPrefix = typeof GM_SYSTEM_PREFIX;
type GmEventNameWithoutPrefix = ActionType;
type GmEventName = `${GmSystemPrefix}:${GmEventNameWithoutPrefix}`;

declare const controlActions: readonly ["on", "off"];
interface GmControlSwitchEvent extends GmBaseEvent {
    name: `${GmSystemPrefix}:control:switch`;
    actionType: 'control';
    action: (typeof controlActions)[number];
    section: ModeType;
    mode: ModeName;
}
interface GmControlLoadEvent extends GmBaseEvent {
    name: `${GmSystemPrefix}:control:load`;
    actionType: 'control';
    action: 'loaded' | 'unloaded';
}
type GmControlEvent = GmControlSwitchEvent | GmControlLoadEvent;

type BaseFwdEvent<T extends {
    actionType: string;
    action: string;
}> = {
    name: string;
} & Pick<T, 'actionType' | 'action'>;

type FwdEditModeName = EditModeName | 'edit';
interface FeatureEditStartFwdEvent extends BaseFwdEvent<GmEditFeatureEditStartEvent> {
    name: `${GmPrefix}:${FwdEditModeName}start`;
    shape: FeatureShape;
    feature: FeatureData;
    map: AnyMapInstance;
}
interface FeatureEditEndFwdEvent extends BaseFwdEvent<GmEditFeatureEditEndEvent> {
    name: `${GmPrefix}:${FwdEditModeName}end`;
    shape: FeatureShape;
    feature: FeatureData;
    map: AnyMapInstance;
}
type FeatureEditFwdEvent = FeatureEditStartFwdEvent | FeatureEditEndFwdEvent;

interface FeatureCreatedFwdEvent extends BaseFwdEvent<GmDrawFeatureCreatedEvent> {
    name: `${GmPrefix}:create`;
    shape: DrawModeName;
    feature: FeatureData;
    map: AnyMapInstance;
}
interface FeatureRemovedFwdEvent extends BaseFwdEvent<GmEditFeatureRemovedEvent> {
    name: `${GmPrefix}:remove`;
    shape: DrawModeName;
    feature: FeatureData;
    map: AnyMapInstance;
}
interface FeatureUpdatedFwdEvent extends BaseFwdEvent<GmEditFeatureUpdatedEvent> {
    name: `${GmPrefix}:${FwdEditModeName}`;
    map: AnyMapInstance;
    shape?: FeatureShape;
    feature?: FeatureData;
    features?: Array<FeatureData>;
    originalFeature?: FeatureData;
    originalFeatures?: Array<FeatureData>;
}
type FeatureFwdEvent = FeatureCreatedFwdEvent | FeatureRemovedFwdEvent | FeatureUpdatedFwdEvent;

interface GlobalDrawToggledFwdEvent extends BaseFwdEvent<GmDrawModeEvent> {
    name: `${GmPrefix}:globaldrawmodetoggled`;
    enabled: boolean;
    shape: DrawModeName;
    map: AnyMapInstance;
}
interface GlobalDrawEnabledDisabledFwdEvent extends BaseFwdEvent<GmDrawModeEvent> {
    name: `${GmPrefix}:${'drawstart' | 'drawend'}`;
    shape: DrawModeName;
    map: AnyMapInstance;
}
interface GlobalEditToggledFwdEvent extends BaseFwdEvent<GmEditModeEvent> {
    name: `${GmPrefix}:global${FwdEditModeName}modetoggled`;
    enabled: boolean;
    map: AnyMapInstance;
}
interface GlobalHelperToggledFwdEvent extends BaseFwdEvent<GmHelperModeEvent> {
    name: `${GmPrefix}:global${HelperModeName}modetoggled`;
    enabled: boolean;
    map: AnyMapInstance;
}
type GlobalModeToggledFwdEvent = GlobalDrawToggledFwdEvent | GlobalEditToggledFwdEvent | GlobalHelperToggledFwdEvent | GlobalDrawEnabledDisabledFwdEvent;

interface GmLoadStateFwdEvent extends BaseFwdEvent<GmControlLoadEvent> {
    name: `${GmPrefix}:${GmControlLoadEvent['action']}`;
    map: AnyMapInstance;
    [GM_PREFIX]: Geoman;
}
type SystemFwdEvent = GmLoadStateFwdEvent;

type GmFwdEventNameWithPrefix = `${GmPrefix}:${GmFwdEventName}`;
type GmFwdSystemEventNameWithPrefix = `${GmSystemPrefix}:${GmEventNameWithoutPrefix}`;
type GlobalEventsListener = (event: GmSystemEvent | GmEvent) => void;
type GmFwdEventName = 'globaldrawmodetoggled' | 'drawstart' | 'drawend' | `global${FwdEditModeName}modetoggled` | `global${HelperModeName}modetoggled` | 'create' | 'remove' | FwdEditModeName | `${FwdEditModeName}start` | `${FwdEditModeName}end` | GmControlLoadEvent['action'];
type GmEvent = SystemFwdEvent | GlobalModeToggledFwdEvent | FeatureFwdEvent | FeatureEditFwdEvent;

type PartialCircleLayer = Pick<CircleLayerSpecification, 'type' | 'paint' | 'layout'>;
type PartialLineLayer = Pick<LineLayerSpecification, 'type' | 'paint' | 'layout'>;
type PartialFillLayer = Pick<FillLayerSpecification, 'type' | 'paint' | 'layout'>;
type PartialSymbolLayer = Pick<SymbolLayerSpecification, 'type' | 'paint' | 'layout'>;

type StyleVariables = {
    lineColor: string;
    lineOpacity: number;
    lineWidth: number;
    fillColor: string;
    fillOpacity: number;
    circleMarkerRadius: number;
};
type PartialLayerStyle = PartialLineLayer | PartialFillLayer | PartialCircleLayer | PartialSymbolLayer;
type SourceStyles = Record<keyof SourcesStorage, StyleVariables>;
type LayerStyle = Record<keyof SourcesStorage, Array<PartialLayerStyle>>;

type LngLatTuple = [number, number];
type ScreenPoint = [number, number];
declare const pointerEvents: readonly ["click", "dblclick", "mousedown", "mouseup", "mousemove", "mouseenter", "mouseleave", "mouseover", "mouseout", "contextmenu", "touchstart", "touchend", "touchmove", "touchcancel"];
type PointerEventName = (typeof pointerEvents)[number];
declare const baseMapEventNames: readonly ["load"];
type BaseMapEventName = (typeof baseMapEventNames)[number];
declare const gmServiceEventNames: readonly ["loaded"];
type GmServiceEventName = (typeof gmServiceEventNames)[number];
type GmServiceEventNameWithPrefix = `${GmPrefix}:${GmServiceEventName}`;
type MapEventName = PointerEventName | BaseMapEventName;
type AnyEventName = GmEventName | MapEventName | GmFwdEventNameWithPrefix | GmFwdSystemEventNameWithPrefix | GmServiceEventNameWithPrefix;
type BaseEventListener$1<T extends string = AnyEventName> = (event: EventFor<T>) => void;
type GeoJsonFeatureData = {
    id: FeatureId | undefined;
    sourceName: FeatureSourceName;
    geoJson: GeoJsonImportFeature;
};
type MapTypes = {
    maplibre: object;
};
type AnyMapInstance = MapTypes[keyof MapTypes];
type BaseControlsPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
type CursorType = 'move' | 'pointer' | 'grab' | 'crosshair' | '';
type MapInstanceWithGeoman<T = AnyMapInstance> = {
    gm: Geoman;
} & T;
type GeoJsonUniversalDiff = {
    remove?: Array<FeatureId>;
    add?: Array<Feature>;
    update?: Array<Feature>;
};
type BaseFitBoundsOptions = {
    padding?: number;
};
type AnchorPosition = 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
type BaseDomMarkerOptions = {
    element: HTMLElement;
    draggable?: boolean;
    anchor?: AnchorPosition;
};
type BasePopupOptions = {
    offset: number;
    closeOnClick: boolean;
    closeButton: boolean;
    focusAfterOpen: boolean;
    anchor: AnchorPosition;
    className: string;
};
interface MapWithOnceMethod {
    once(type: string, listener: (ev: unknown) => void): this;
    off(type: string, listener: (ev: unknown) => void): this;
}
declare const mapInteractions: readonly ["scrollZoom", "boxZoom", "dragRotate", "dragPan", "keyboard", "doubleClickZoom", "touchZoomRotate", "touchPitch"];
type MapInteraction = (typeof mapInteractions)[number];

type ImportGeoJsonProperties = {
    shape?: ShapeName;
    center?: LngLatTuple;
    text?: string;
    [key: string]: unknown;
};
type PointBasedGeometry = Point | MultiPoint;
type LineBasedGeometry = LineString | MultiLineString | Polygon | MultiPolygon;
type BasicGeometry = PointBasedGeometry | LineBasedGeometry;
type GeoJsonShapeFeature = Feature<BasicGeometry, ShapeGeoJsonProperties>;
type GeoJsonImportFeature = Feature<BasicGeometry, ImportGeoJsonProperties>;
type GeoJsonLineFeature = Feature<LineString, ShapeGeoJsonProperties>;
type GeoJsonShapeFeatureCollection = FeatureCollection<BasicGeometry, ShapeGeoJsonProperties>;
type GeoJsonImportFeatureCollection = FeatureCollection<BasicGeometry, ImportGeoJsonProperties>;
type LngLatDiff = {
    lng: number;
    lat: number;
};
interface PositionData {
    coordinate: LngLatTuple;
    path: Array<string | number>;
}
type SegmentPosition = {
    start: PositionData;
    end: PositionData;
};
type CoordinateIndices = {
    absCoordIndex: number;
    featureIndex: number;
    multiFeatureIndex: number;
    geometryIndex: number;
};

type WithPrefixedKeys<T, P extends string> = {
    [K in keyof T as `${P}${Extract<K, string>}`]: T[K];
};

type FeatureId = number | string;
type FeatureShape = ShapeName | `${MarkerData['type']}_marker` | 'snap_guide';
type ShapeGeoJsonProperties = {
    [FEATURE_ID_PROPERTY]?: FeatureId;
    [key: string]: unknown;
};
type FeatureDataParameters = {
    gm: Geoman;
    id: FeatureId;
    parent: FeatureData | null;
    source: BaseSource;
    geoJsonShapeFeature: GeoJsonShapeFeature;
    /** Skip adding to source (used when hydrating from existing source data) */
    skipSourceUpdate?: boolean;
};
type FeatureSourceName = (typeof SOURCES)[keyof typeof SOURCES];
type SourcesStorage = {
    [key in FeatureSourceName]: BaseSource | null;
};
type FeatureStore = Map<FeatureId, FeatureData>;
type ForEachFeatureDataCallbackFn = (value: FeatureData, key: FeatureId, map: FeatureStore) => void;
type FeatureShapeProperties = {
    id?: FeatureId;
    shape?: FeatureShape;
    center?: LngLatTuple;
    xSemiAxis?: number;
    ySemiAxis?: number;
    angle?: number;
    text?: string;
    disableEdit?: boolean;
};
type PrefixedFeatureShapeProperties = WithPrefixedKeys<FeatureShapeProperties, typeof FEATURE_PROPERTY_PREFIX>;
type ImportGeoJsonOptions = {
    /** Property name to use as feature ID (e.g., 'id', 'customId') */
    idPropertyName?: string;
    /** If true, existing features with the same ID will be replaced */
    overwrite?: boolean;
};

declare module 'maplibre-gl' {
    interface MapEventType extends EventsMap {
    }
}

declare class EventForwarder {
    gm: Geoman;
    globalEventsListener: GlobalEventsListener | null;
    constructor(gm: Geoman);
    get map(): object;
    processEvent(eventName: GmEventName, payload: GmSystemEvent): Promise<void>;
    forwardModeToggledEvent(payload: GmDrawModeEvent | GmEditModeEvent | GmHelperModeEvent): Promise<void>;
    forwardFeatureCreated(payload: GmDrawFeatureCreatedEvent): Promise<void>;
    forwardFeatureRemoved(payload: GmEditFeatureRemovedEvent): Promise<void>;
    forwardFeatureUpdated(payload: GmEditFeatureUpdatedEvent): Promise<void>;
    forwardFeatureEditStart(payload: GmEditFeatureEditStartEvent): Promise<void>;
    forwardFeatureEditEnd(payload: GmEditFeatureEditEndEvent): Promise<void>;
    forwardGeomanLoaded(inputPayload: GmControlLoadEvent): Promise<void>;
    fireToMap({ type, eventName, payload, }: {
        type: 'system';
        eventName: GmEventNameWithoutPrefix;
        payload: GmSystemEvent;
    } | {
        type: 'converted';
        eventName: GmFwdEventName;
        payload: GmEvent;
    }): Promise<void>;
    getConvertedEditModeName(mode: EditModeName): FwdEditModeName;
}

declare class EventBus {
    gm: Geoman;
    forwarder: EventForwarder;
    mapEventHandlers: MapEventHandlersWithControl;
    gmEventHandlers: GmEventHandlersWithControl;
    constructor(gm: Geoman);
    private pendingForward;
    fireEvent(eventName: GmEventName, payload: GmSystemEvent): void;
    attachEvents(handlers: EventHandlers): void;
    detachEvents(handlers: EventHandlers): void;
    detachAllEvents(): void;
    on(eventName: AnyEventName, handler: MapEventHadler | GmEventHadler): void;
    onGmEvent(eventName: GmEventName, handler: GmEventHadler): void;
    onMapEvent(eventName: MapEventName, handler: MapEventHadler): void;
    off(eventName: AnyEventName, handler: GmEventHadler | MapEventHadler): void;
    offGmEvent(eventName: GmEventName, handler: GmEventHadler): void;
    offMapEvent(eventName: MapEventName, handler: MapEventHadler): void;
    createEventSection(eventName: MapEventName | GmEventName): {
        handlers: never[];
        controlHandler: (event: GmSystemEvent | GmEvent | BaseMapEvent) => void;
    };
}

declare abstract class BaseEventListener {
    gm: Geoman;
    protected constructor(gm: Geoman);
    trackExclusiveModes(payload: GmSystemEvent): void;
    trackRelatedModes(payload: GmSystemEvent): void;
    getControl(payload: GmDrawModeEvent | GmEditModeEvent | GmHelperModeEvent | GmControlSwitchEvent): GenericSystemControl | null;
    getControlOptions(payload: GmDrawModeEvent | GmEditModeEvent | GmHelperModeEvent | GmControlSwitchEvent): ControlOptions | null;
    getControlIds(payload: GmDrawModeEvent | GmEditModeEvent | GmHelperModeEvent | GmControlSwitchEvent): {
        sectionName: "draw" | "edit" | "helper";
        modeName: ModeName;
    } | null;
}

declare class GmEvents {
    gm: Geoman;
    bus: EventBus;
    listeners: {
        [key in ActionType]?: BaseEventListener;
    };
    constructor(gm: Geoman);
    fire(eventName: GmEventName, payload: GmSystemEvent): void;
}

type SourceUpdateMethods = {
    [key in FeatureSourceName]: () => void;
};
declare class SourceUpdateManager {
    gm: Geoman;
    updateStorage: {
        [key in FeatureSourceName]: Array<GeoJsonUniversalDiff>;
    };
    autoUpdatesEnabled: boolean;
    delayedSourceUpdateMethods: SourceUpdateMethods;
    pendingUpdatePromises: {
        [key in FeatureSourceName]?: Promise<void>[];
    };
    constructor(gm: Geoman);
    updatesPending(sourceName: FeatureSourceName): boolean;
    getFeatureId(feature: Feature): any;
    updateSource({ sourceName, diff, }: {
        sourceName: FeatureSourceName;
        diff?: GeoJsonUniversalDiff;
    }): void;
    updateSourceActual(sourceName: FeatureSourceName): void;
    /**
     * Add a pending promise to the tracking array for a source.
     * Automatically removes the promise from the array when it resolves.
     */
    private addPendingPromise;
    /**
     * Wait for any pending MapLibre source updates to complete.
     * This ensures data is committed before events are fired.
     *
     * When there are queued updates in updateStorage that haven't been processed yet
     * (due to throttling), this method flushes them immediately and waits for completion.
     *
     * Note: We call updateData() directly here rather than going through updateSourceActual()
     * because updateSourceActual() checks `!source.loaded` and may delay processing.
     * When waiting for pending updates (e.g., for event handlers), we need immediate processing.
     *
     * This is safe and won't cause duplicates because getCombinedDiff() atomically drains
     * the storage - whoever calls it first gets the diffs, subsequent calls get null.
     *
     * IMPORTANT: MapLibre's _updateWorkerData() has a guard that returns early if already
     * updating (`if (this._isUpdatingWorker) return`). This means updateData() can return
     * a promise that resolves before the data is actually committed to serialize().
     * To handle this, we loop until both storage and pending promises are empty, with
     * a microtask yield between iterations to allow MapLibre's recursive updates to run.
     */
    waitForPendingUpdates(sourceName: FeatureSourceName): Promise<void>;
    withAtomicSourcesUpdate<T>(callback: () => T): T;
    getCombinedDiff(sourceName: FeatureSourceName): GeoJsonUniversalDiff | null;
    mergeGeoJsonDiff(pendingDiffOrNull: GeoJsonUniversalDiff | null, nextDiffOrNull: GeoJsonUniversalDiff | null): GeoJsonUniversalDiff;
}

declare abstract class BaseLayer<TLayerInstance = unknown> {
    abstract layerInstance: TLayerInstance | null;
    abstract get id(): string;
    abstract get source(): string;
    abstract createLayer(options: unknown): TLayerInstance;
    abstract remove(): void;
    isInstanceAvailable(): this is {
        layerInstance: TLayerInstance;
    };
}

declare class Features {
    gm: Geoman;
    featureCounter: number;
    featureStore: FeatureStore;
    featureStoreAllowedSources: Array<FeatureSourceName>;
    sources: SourcesStorage;
    defaultSourceName: FeatureSourceName;
    updateManager: SourceUpdateManager;
    layers: Array<BaseLayer>;
    constructor(gm: Geoman);
    get forEach(): (callbackfn: ForEachFeatureDataCallbackFn) => void;
    get tmpForEach(): (callbackfn: ForEachFeatureDataCallbackFn) => void;
    init(): void;
    /**
     * Hydrates the feature store from existing sources and syncs the ID counter.
     * This is called during init to restore state when remounting on preserved sources.
     */
    hydrateFromExistingSources(): void;
    getNewFeatureId(shapeGeoJson: GeoJsonShapeFeature): FeatureId;
    filteredForEach(filterFn: (featureData: FeatureData) => boolean): (callbackfn: ForEachFeatureDataCallbackFn) => void;
    has(sourceName: keyof SourcesStorage, featureId: FeatureId): boolean;
    get(sourceName: keyof SourcesStorage, featureId: FeatureId): FeatureData | null;
    add(featureData: FeatureData): void;
    setDefaultSourceName(sourceName: FeatureSourceName): void;
    createSource(sourceName: FeatureSourceName): BaseSource<unknown>;
    delete(featureIdOrFeatureData: FeatureData | FeatureId): void;
    deleteAll(): void;
    getFeatureByMouseEvent({ event, sourceNames, }: {
        event: BaseMapPointerEvent;
        sourceNames: Array<FeatureSourceName>;
    }): FeatureData | null;
    getFeaturesByGeoJsonBounds({ geoJson, sourceNames, }: {
        geoJson: Feature<Polygon | MultiPolygon | LineString>;
        sourceNames: Array<FeatureSourceName>;
    }): Array<FeatureData>;
    getFeaturesByScreenBounds({ bounds, sourceNames, }: {
        bounds: [ScreenPoint, ScreenPoint];
        sourceNames: Array<FeatureSourceName>;
    }): FeatureData[];
    createFeature({ featureId, shapeGeoJson, parent, sourceName, imported, }: {
        featureId?: FeatureId;
        shapeGeoJson: GeoJsonShapeFeature;
        parent?: FeatureData;
        sourceName: FeatureSourceName;
        imported?: boolean;
    }): FeatureData | null;
    importGeoJson(geoJson: GeoJsonImportFeatureCollection | GeoJsonImportFeature, options?: ImportGeoJsonOptions): {
        stats: {
            total: number;
            success: number;
            failed: number;
            overwritten: number;
        };
        addedFeatures: Array<FeatureData>;
    };
    importGeoJsonFeature(shapeGeoJson: GeoJsonImportFeature): FeatureData | null;
    getAll(): FeatureCollection;
    /**
     * Exports GeoJSON from Geoman's internal state.
     *
     * This is the recommended method for most use cases as it always returns the latest
     * feature data, even during event handlers before MapLibre has committed changes.
     *
     * @param options - Export options
     * @param options.allowedShapes - Filter to only include specific shape types
     * @param options.idPropertyName - Property name to use for feature IDs (default: 'gm_id')
     * @returns GeoJSON FeatureCollection with all features
     *
     * @example
     * // Export all features
     * const geoJson = geoman.features.exportGeoJson();
     *
     * // Export only polygons and circles
     * const shapes = geoman.features.exportGeoJson({ allowedShapes: ['polygon', 'circle'] });
     */
    exportGeoJson({ allowedShapes, idPropertyName, }?: {
        allowedShapes?: Array<FeatureShape>;
        idPropertyName?: string;
    }): GeoJsonShapeFeatureCollection;
    /**
     * Exports GeoJSON directly from MapLibre's underlying source data.
     *
     * This method reads from MapLibre's serialized source state, which may lag slightly
     * behind Geoman's internal state during rapid updates or in event handlers.
     *
     * Use this method when you specifically need to verify what MapLibre has committed
     * to its source, for debugging, or for synchronization with external systems that
     * read directly from MapLibre sources.
     *
     * For most use cases, prefer `exportGeoJson()` which uses Geoman's internal state
     * and is always up-to-date.
     *
     * @param options - Export options
     * @param options.allowedShapes - Filter to only include specific shape types
     * @param options.idPropertyName - Property name to use for feature IDs (default: 'gm_id')
     * @returns GeoJSON FeatureCollection from MapLibre's source
     *
     * @example
     * // Export features as stored in MapLibre source
     * const geoJson = geoman.features.exportGeoJsonFromSource();
     *
     * // Verify MapLibre has committed the data
     * await geoman.features.waitForPendingUpdates();
     * const committed = geoman.features.exportGeoJsonFromSource();
     */
    exportGeoJsonFromSource({ allowedShapes, idPropertyName, }?: {
        allowedShapes?: Array<FeatureShape>;
        idPropertyName?: string;
    }): GeoJsonShapeFeatureCollection;
    asGeoJsonFeatureCollection({ shapeTypes, sourceNames, idPropertyName, useMapLibreSource, }: {
        shapeTypes?: Array<FeatureShape>;
        sourceNames: Array<FeatureSourceName>;
        idPropertyName?: string;
        useMapLibreSource?: boolean;
    }): GeoJsonShapeFeatureCollection;
    convertSourceToGm(inputSource: BaseSource): Array<FeatureData>;
    addGeoJsonFeature({ shapeGeoJson, sourceName, defaultSource, }: {
        shapeGeoJson: GeoJsonImportFeature;
        sourceName?: FeatureSourceName;
        defaultSource?: boolean;
    }): FeatureData | null;
    createLayers(): Array<BaseLayer>;
    createGenericLayer({ sourceName, shapeNames, partialStyle, }: {
        sourceName: FeatureSourceName;
        shapeNames: Array<FeatureShape>;
        partialStyle: PartialLayerStyle;
    }): BaseLayer | null;
    getGenericLayerName({ sourceName, shapeNames, partialStyle, }: {
        sourceName: FeatureSourceName;
        shapeNames: Array<FeatureShape>;
        partialStyle: PartialLayerStyle;
    }): string | null;
    getFeatureShapeByGeoJson(shapeGeoJson: Feature): ShapeName | null;
    createMarkerFeature({ parentFeature, coordinate, type, sourceName, }: {
        type: MarkerData['type'];
        coordinate: LngLatTuple;
        parentFeature: FeatureData;
        sourceName: FeatureSourceName;
    }): FeatureData | null;
    updateMarkerFeaturePosition(markerFeatureData: FeatureData, coordinates: LngLatTuple): void;
    fireFeatureCreatedEvent(featureData: FeatureData): void;
}

declare abstract class BasePopup<TPopupInstance = unknown> {
    abstract popupInstance: TPopupInstance | null;
    abstract setLngLat(lngLat: LngLatTuple): void;
    abstract setHtml(htmlContent: string): void;
    abstract remove(): void;
    isInstanceAvailable(): this is {
        popupInstance: TPopupInstance;
    };
}

declare abstract class BaseMapAdapter<TMapInstance = MapInstanceWithGeoman, TSource = unknown, TLayer = unknown> {
    abstract mapType: keyof MapTypes;
    abstract mapInstance: TMapInstance;
    abstract getMapInstance(): TMapInstance;
    abstract isLoaded(): boolean;
    abstract getContainer(): HTMLElement;
    abstract getCanvas(): HTMLCanvasElement;
    abstract addControl(control: GMControl): void;
    abstract removeControl(control: GMControl): void;
    abstract loadImage({ id, image }: {
        id: string;
        image: string;
    }): Promise<void>;
    abstract removeImage(id: string): void;
    abstract getBounds(): [LngLatTuple, LngLatTuple];
    abstract fitBounds(bounds: [LngLatTuple, LngLatTuple], options?: BaseFitBoundsOptions): void;
    abstract setCursor(cursor: CursorType): void;
    abstract disableMapInteractions(interactionTypes: Array<MapInteraction>): void;
    abstract enableMapInteractions(interactionTypes: Array<MapInteraction>): void;
    abstract setDragPan(value: boolean): void;
    abstract queryFeaturesByScreenCoordinates({ queryCoordinates, sourceNames, }: {
        queryCoordinates: ScreenPoint | [ScreenPoint, ScreenPoint];
        sourceNames: Array<FeatureSourceName>;
    }): Array<FeatureData>;
    abstract queryGeoJsonFeatures({ queryCoordinates, sourceNames, }: {
        queryCoordinates?: ScreenPoint | [ScreenPoint, ScreenPoint];
        sourceNames: Array<FeatureSourceName>;
    }): Array<GeoJsonFeatureData>;
    abstract addSource(sourceId: string, geoJson: GeoJSON): BaseSource<TSource>;
    abstract getSource(sourceId: string): BaseSource<TSource>;
    abstract addLayer(options: unknown): BaseLayer<TLayer>;
    abstract getLayer(layerId: string): BaseLayer<TLayer> | null;
    abstract removeLayer(layerId: string): void;
    abstract eachLayer(callback: (layer: BaseLayer<TLayer>) => void): void;
    abstract createDomMarker(options: BaseDomMarkerOptions, lngLat: LngLatTuple): BaseDomMarker;
    abstract createPopup(options: BasePopupOptions): BasePopup;
    abstract project(position: LngLatTuple): ScreenPoint;
    abstract unproject(point: ScreenPoint): LngLatTuple;
    abstract coordBoundsToScreenBounds(bounds: [LngLatTuple, LngLatTuple]): [ScreenPoint, ScreenPoint];
    getEuclideanNearestLngLat(shapeGeoJson: Feature<LineBasedGeometry> | FeatureCollection<LineBasedGeometry>, lngLat: LngLatTuple): LngLatTuple;
    abstract fire(type: AnyEventName, data?: unknown): void;
    abstract on<T extends AnyEventName>(type: T, listener: BaseEventListener$1<T>): void;
    abstract on(type: MapEventName, layerId: string, listener: BaseEventListener$1): void;
    abstract once<T extends AnyEventName>(type: AnyEventName, listener: BaseEventListener$1<T>): void;
    abstract once(type: MapEventName, layerId: string, listener: BaseEventListener$1): void;
    abstract off<T extends AnyEventName>(type: AnyEventName, listener: BaseEventListener$1<T>): void;
    abstract off(type: MapEventName, layerId: string, listener: BaseEventListener$1): void;
    getDistance(lngLat1: LngLatTuple, lngLat2: LngLatTuple): number;
}

declare class GmOptions {
    gm: Geoman;
    settings: GmOptionsData['settings'];
    controls: GmOptionsData['controls'];
    layerStyles: GmOptionsData['layerStyles'];
    constructor(gm: Geoman, inputOptions: PartialDeep<GmOptionsData>);
    getMergedOptions(options?: PartialDeep<GmOptionsData>): GmOptionsData;
    enableMode(modeType: ModeType, modeName: ModeName): void;
    disableMode(modeType: ModeType, modeName: ModeName): void;
    syncModeState(modeType: ModeType, modeName: ModeName): void;
    toggleMode(modeType: ModeType, modeName: ModeName): void;
    isModeEnabled(actionType: ActionType, modeName: ModeName): boolean;
    isModeAvailable(actionType: ActionType, modeName: ModeName): boolean;
    getControlOptions({ modeType, modeName, }: {
        modeType: ModeType;
        modeName: ModeName;
    }): ControlOptions | null;
    fireModeEvent(sectionName: ActionType, modeName: ModeName, action: ModeAction): void;
    fireControlEvent(sectionName: ModeType, modeName: ModeName, action: GmControlSwitchEvent['action']): void;
}

type EnableMarkerParameters = {
    lngLat?: LngLatTuple;
    customMarker?: BaseDomMarker;
    invisibleMarker?: boolean;
};
declare class MarkerPointer {
    gm: Geoman;
    marker: BaseDomMarker | null;
    tmpMarker: BaseDomMarker | null;
    throttledMethods: {
        onMouseMove: MapEventHadler;
    };
    eventHandlers: EventHandlers;
    private snapping;
    private oldSnapping;
    constructor(gm: Geoman);
    get snappingHelper(): SnappingHelper | null;
    initEventHandlers(): void;
    setSnapping(snapping: boolean): void;
    pauseSnapping(): void;
    resumeSnapping(): void;
    enable({ lngLat, customMarker, invisibleMarker }?: EnableMarkerParameters): void;
    disable(): void;
    createMarker(lngLat?: LngLatTuple): BaseDomMarker;
    createInvisibleMarker(lngLat?: LngLatTuple): BaseDomMarker;
    onMouseMove(event: BaseMapEvent): {
        next: boolean;
    };
    syncTmpMarker(lngLat: LngLatTuple): void;
}

declare const isGmDrawEvent: (payload: unknown) => payload is GmDrawEvent;
declare const isGmDrawShapeEvent: (payload: unknown) => payload is GmDrawShapeEvent | GmDrawShapeEventWithData;
declare const isGmDrawLineDrawerEvent: (payload: unknown) => payload is GmDrawLineDrawerEvent | GmDrawLineDrawerEventWithData;
declare const isGmDrawFreehandDrawerEvent: (payload: unknown) => payload is GmDrawFreehandDrawerEvent | GmDrawFreehandDrawerEventWithData;

declare const isGmHelperEvent: (payload: unknown) => payload is GmHelperModeEvent;

declare const isGmEditEvent: (payload: unknown) => payload is GmEditEvent;

declare const isActionType: (name: string) => name is ActionType;
declare const isDrawModeName: (name: string) => name is DrawModeName;
declare const isEditModeName: (name: string) => name is EditModeName;
declare const isHelperModeName: (name: string) => name is HelperModeName;
declare const isModeName: (name: string) => name is ModeName;

type ModeOptionName = DrawModeName | EditModeName | HelperModeName;
type ControlIcons = Record<ModeOptionName, string | null>;
declare const controlIcons: ControlIcons;

declare const customShapeTriangle: {
    type: string;
    properties: {
        shape: string;
    };
    geometry: {
        type: string;
        coordinates: number[][][][];
    };
};
declare const customShapeRectangle: {
    type: string;
    properties: {
        shape: string;
    };
    geometry: {
        type: string;
        coordinates: number[][][];
    };
};

declare const mergeByTypeCustomizer: (objValue: unknown, srcValue: unknown) => any[] | undefined;

declare const convertToThrottled: <T extends object>(methods: T, context: unknown, wait?: number) => T;

declare const moveGeoJson: (geoJson: GeoJsonShapeFeature, lngLatDiff: LngLatDiff) => GeoJsonShapeFeature;
declare const moveFeatureData: (featureData: FeatureData, lngLatDiff: LngLatDiff) => void;
declare const isGeoJsonFeatureInPolygon: (featureGeoJson: Feature, containerGeoJson: Feature<Polygon | MultiPolygon>) => boolean;

declare const isEqualPosition: (position1: LngLatTuple, position2: LngLatTuple) => boolean;
declare const isPolygonFeature: (geoJson: Feature | FeatureCollection) => geoJson is Feature<Polygon>;
declare const isMultiPolygonFeature: (geoJson: Feature | FeatureCollection) => geoJson is Feature<MultiPolygon>;
declare const getLngLatDiff: (startLngLat: LngLatTuple, endLngLat: LngLatTuple) => LngLatDiff;
declare const eachCoordinateWithPath: (geoJson: GeoJSON, callback: (position: PositionData, index: number) => void, skipClosingCoordinate?: boolean) => void;
declare const findCoordinateWithPath: (geoJson: GeoJSON, coordinate: LngLatTuple) => {
    index: number;
    coordinate: LngLatTuple;
    path: (string | number)[];
} | null;
declare const eachSegmentWithPath: (geoJson: GeoJSON, callback: (segment: SegmentPosition, index: number) => void) => void;
declare const twoCoordsToLineString: (position1: LngLatTuple, position2: LngLatTuple, properties?: GeoJsonProperties) => Feature<LineString>;
declare const geoJsonPointToLngLat: (geoJson: Feature<Point>) => LngLatTuple;
declare const boundsToBBox: (bounds: [LngLatTuple, LngLatTuple]) => BBox;
declare const boundsContains: (bounds: [LngLatTuple, LngLatTuple], lngLat: LngLatTuple) => boolean;
declare const getGeoJsonCoordinatesCount: (geoJson: GeoJSON) => number;
declare const getGeoJsonFirstPoint: (shapeGeoJson: GeoJSON) => LngLatTuple | null;
declare const getEuclideanDistance: (point1: ScreenPoint, point2: ScreenPoint) => number;
declare const getEuclideanSegmentNearestPoint: (linePoint1: ScreenPoint, linePoint2: ScreenPoint, targetPoint: ScreenPoint) => ScreenPoint;
declare const calculatePerimeter: (geoJson: Feature<LineBasedGeometry>) => number;
declare const convertToLineStringFeatureCollection: (sourceFeatureCollection: GeoJsonShapeFeatureCollection) => FeatureCollection<LineString>;
declare const lngLatToGeoJsonPoint: (position: LngLatTuple, shape?: Extract<ShapeName, "marker" | "text_marker" | "circle_marker">) => GeoJsonShapeFeature;

type NumberFormatOptions = {
    units: 'imperial' | 'metric';
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
};
declare const toMod: (num: number, mod: number) => number;
declare const formatDistance: (num: number, options: NumberFormatOptions) => string;
declare const formatArea: (num: number, options: NumberFormatOptions) => string;

declare const typedKeys: <T extends object>(obj: T) => Array<keyof T>;
declare const includesWithType: <T extends readonly string[]>(value: string, validValues: T) => value is T[number];

declare const isGmControlEvent: (payload: unknown) => payload is GmControlSwitchEvent;

declare const isGmEvent: (payload: unknown) => payload is GmSystemEvent;

declare function isPointerEventName(key: string): key is PointerEventName;
declare function isBaseMapEventName(key: string): key is BaseMapEventName;
declare const isMapWithOnceMethod: (map: unknown) => map is MapWithOnceMethod;
declare const isMapPointerEvent: (event: BaseMapEvent, options?: {
    warning: boolean;
}) => event is BaseMapPointerEvent;

declare const isGmModeEvent: (payload: unknown) => payload is GmBaseModeEvent;

declare const isNonEmptyArray: <T>(arr: T[] | readonly T[]) => arr is NonEmptyArray<T>;

type UpdateShapeHandler = (featureData: FeatureData, lngLatStart: LngLatTuple, lngLatEnd: LngLatTuple) => GeoJsonShapeFeature | null;
declare abstract class BaseDrag extends BaseEdit {
    mode: EditModeName;
    previousLngLat: LngLatTuple | null;
    pointBasedShapes: Array<FeatureShape>;
    throttledMethods: {
        onMouseMove: (event: BaseMapEvent) => MapHandlerReturnData;
    };
    eventHandlers: {
        [x: string]: ((event: GmSystemEvent) => MapHandlerReturnData) | ((event: BaseMapEvent) => MapHandlerReturnData);
        mousedown: (event: BaseMapEvent) => MapHandlerReturnData;
        touchstart: (event: BaseMapEvent) => MapHandlerReturnData;
        mousemove: (event: BaseMapEvent) => MapHandlerReturnData;
        touchmove: (event: BaseMapEvent) => MapHandlerReturnData;
        mouseup: (event: BaseMapEvent) => MapHandlerReturnData;
        touchend: (event: BaseMapEvent) => MapHandlerReturnData;
    };
    getUpdatedGeoJsonHandlers: {
        [key in FeatureShape]?: UpdateShapeHandler;
    };
    onMouseDown(event: BaseMapEvent): MapHandlerReturnData;
    onMouseUp(event: BaseMapEvent): MapHandlerReturnData;
    onMouseMove(event: BaseMapEvent): MapHandlerReturnData;
    isPointBasedShape(): boolean;
    abstract handleGmEdit(event: GmSystemEvent): MapHandlerReturnData;
    alignShapeCenterWithControlMarker(featureData: FeatureData, event: BaseMapEvent): void;
    moveFeature(featureData: FeatureData, newLngLat: LngLatTuple): void;
    moveSource(featureData: FeatureData, oldLngLat: LngLatTuple, newLngLat: LngLatTuple): GeoJsonShapeFeature;
    moveEllipse(featureData: FeatureData, oldLngLat: LngLatTuple, newLngLat: LngLatTuple): GeoJsonShapeFeature | null;
    moveCircle(featureData: FeatureData, oldLngLat: LngLatTuple, newLngLat: LngLatTuple): GeoJsonShapeFeature | null;
}

declare abstract class BaseGroupEdit extends BaseEdit {
    abstract mode: EditModeName;
    abstract allowedShapeTypes: Array<FeatureShape>;
    features: Array<FeatureData>;
    featureData: FeatureData | null;
    eventHandlers: {
        click: (event: BaseMapEvent) => MapHandlerReturnData;
    };
    onStartAction(): void;
    onEndAction(): void;
    onMouseClick(event: BaseMapEvent): MapHandlerReturnData;
    unselectFeature(event: BaseMapPointerEvent): boolean;
    getAllowedFeatureByMouseEvent({ event, sourceNames, }: {
        event: BaseMapPointerEvent;
        sourceNames: Array<FeatureSourceName>;
    }): FeatureData | null;
    isFeatureAllowedToGroup(featureData: FeatureData): boolean;
    groupFeatures(): void;
}

type SharedMarker = {
    markerData: MarkerData;
    featureData: FeatureData;
};
interface SnapGuidesHelperInterface extends BaseHelper {
    removeSnapGuides(): void;
    updateSnapGuides(shapeGeoJson: GeoJsonShapeFeature | null, currentLngLat: LngLatTuple | null, withControlMarker?: boolean): void;
}
interface AutoTraceHelperInterface extends BaseHelper {
    mode: 'auto_trace';
    getShortestPath(lngLatStart: LngLatTuple, lngLatEnd: LngLatTuple): Array<LngLatTuple> | null;
}
interface PinHelperInterface extends BaseHelper {
    mode: 'pin';
    getSharedMarkers(coordinate: LngLatTuple): Array<SharedMarker>;
}

type SegmentData = {
    segment: SegmentPosition;
    middle: PositionData;
    edgeMarkerKey: string;
};
type CreateMarkerParams = {
    type: MarkerData['type'];
    positionData: PositionData;
    parentFeature: FeatureData;
    segment?: EdgeMarkerData['segment'];
};
declare class ShapeMarkersHelper extends BaseHelper {
    mode: HelperModeName;
    pinEnabled: boolean;
    previousPosition: LngLatTuple | null;
    activeMarker: MarkerData | null;
    activeFeatureData: FeatureData | null;
    sharedMarkers: Array<SharedMarker>;
    allowedShapes: Array<FeatureShape>;
    edgeMarkersAllowed: boolean;
    edgeMarkerAllowedShapes: Array<FeatureShape>;
    shapeMarkerAllowedModes: Array<EditModeName>;
    eventHandlers: {
        [x: string]: ((event: GmSystemEvent) => MapHandlerReturnData) | ((event: BaseMapEvent) => MapHandlerReturnData);
        mousedown: (event: BaseMapEvent) => MapHandlerReturnData;
        touchstart: (event: BaseMapEvent) => MapHandlerReturnData;
        mouseup: () => MapHandlerReturnData;
        touchend: () => MapHandlerReturnData;
        mousemove: (event: BaseMapEvent) => MapHandlerReturnData;
        touchmove: (event: BaseMapEvent) => MapHandlerReturnData;
        contextmenu: (event: BaseMapEvent) => MapHandlerReturnData;
    };
    throttledMethods: {
        sendMarkerMoveEvent: (event: BaseMapPointerEvent) => void;
        sendMarkerRightClickEvent: (featureData: FeatureData, markerData: MarkerData) => void;
    };
    debouncedMethods: {
        refreshMarkers: () => void;
    };
    get pinHelperInstance(): PinHelperInterface | null;
    onStartAction(): void;
    onEndAction(): void;
    setPin(enabled: boolean): void;
    onMouseDown(event: BaseMapEvent): MapHandlerReturnData;
    onMouseUp(): MapHandlerReturnData;
    onMouseMove(event: BaseMapEvent): MapHandlerReturnData;
    onMouseRightButtonClick(event: BaseMapEvent): MapHandlerReturnData;
    isShapeMarkerAllowed(): boolean;
    convertToVertexMarker(markerData: MarkerData): MarkerData;
    getFeatureMarkerByMouseEvent(event: BaseMapPointerEvent): Exclude<MarkerData, DomMarkerData> | null;
    addMarkers(): void;
    addCenterMarker(featureData: FeatureData): void;
    getAllShapeSegments(featureData: FeatureData): SegmentData[];
    isEdgeMarkerAllowed(featureData: FeatureData): boolean;
    isMarkerIndexAllowed(shape: FeatureData['shape'], markerIndex: number, verticesCount: number): boolean;
    getEdgeMarkerKey(index: number): string;
    getEndMarkerIndexes(featureData: FeatureData): Set<number>;
    getSegmentMiddlePosition(segment: SegmentPosition): PositionData;
    removeMarkers(): void;
    removeMarker(markerData: MarkerData): void;
    handleGmDraw(event: GmSystemEvent): MapHandlerReturnData;
    refreshMarkers(): void;
    handleGmEdit(event: GmSystemEvent): MapHandlerReturnData;
    handleShapeUpdate(event: GmEditFeatureUpdatedEvent): void;
    createOrUpdateVertexMarker(position: PositionData, featureData: FeatureData): {
        markerKey: string;
        markerData: MarkerData;
    };
    createOrUpdateEdgeMarker(segmentData: SegmentData, featureData: FeatureData): {
        markerKey: string;
        markerData: MarkerData;
    };
    updateCenterMarkerPosition(featureData: FeatureData): void;
    sendMarkerEvent(action: GmEditMarkerEvent['action'], featureData: FeatureData, markerData: MarkerData): void;
    sendMarkerRightClickEvent(featureData: FeatureData, markerData: MarkerData): void;
    sendMarkerMoveEvent(event: BaseMapPointerEvent): void;
    protected createMarker({ type, segment, positionData, parentFeature, }: CreateMarkerParams): MarkerData;
}

type LineDrawerOptions = {
    snappingMarkers: 'first' | 'last' | 'all' | 'none';
    targetShape: Extract<ShapeName, 'line' | 'polygon'>;
};
type MarkerInfo = {
    index: number;
    path: MarkerId | null;
};
type MarkerHandler = ({ markerIndex, shapeCoordinates, geoJson, }: LineEventHandlerArguments) => void;
interface DrawerHandlers {
    firstMarkerClick: MarkerHandler | null;
    lastMarkerClick: MarkerHandler | null;
    nMarkerClick: MarkerHandler | null;
}
declare class LineDrawer extends BaseDraw {
    mode: DrawModeName;
    snappingKey: string;
    drawOptions: LineDrawerOptions;
    shapeLngLats: Array<LngLatTuple>;
    throttledMethods: {
        onMouseMove: (event: BaseMapEvent) => MapHandlerReturnData;
    };
    eventHandlers: {
        [x: string]: ((event: GmSystemEvent) => MapHandlerReturnData) | ((event: BaseMapEvent) => MapHandlerReturnData);
        click: (event: BaseMapEvent) => MapHandlerReturnData;
        mousemove: (event: BaseMapEvent) => MapHandlerReturnData;
    };
    drawerEventHandlers: DrawerHandlers;
    constructor(gm: Geoman, options?: LineDrawerOptions);
    get snapGuidesInstance(): SnapGuidesHelperInterface | null;
    get autoTraceEnabled(): boolean;
    get autoTraceHelperInstance(): AutoTraceHelperInterface | null;
    onStartAction(): void;
    onEndAction(): void;
    clearDrawerHandlers(): void;
    handleGmHelperEvent(event: GmSystemEvent): MapHandlerReturnData;
    updateSnapGuides(): void;
    on<T extends keyof DrawerHandlers>(eventType: T, handler: DrawerHandlers[T]): void;
    onMouseClick(event: BaseMapEvent): MapHandlerReturnData;
    handleNextVertex(lngLat: LngLatTuple, clickedMarkerInfo: MarkerInfo): void;
    getMarkerClickEventData(markerIndex: number): LineEventHandlerArguments;
    onMouseMove(event: BaseMapEvent): MapHandlerReturnData;
    startShape(startLngLat: LngLatTuple): void;
    endShape(): void;
    setSnapping(): void;
    removeSnapping(): void;
    getClickedMarkerInfo(event: BaseMapPointerEvent): MarkerInfo;
    addPoint(newLngLat: LngLatTuple, existingMarkerInfo: MarkerInfo): void;
    isFeatureAllowed(featureGeoJson: GeoJsonShapeFeature): boolean;
    getAddedLngLats(newLngLat: LngLatTuple, existingMarkerInfo: MarkerInfo): LngLatTuple[];
    getAutoTracePath(finishLngLat: LngLatTuple): Array<LngLatTuple> | null;
    getMarkerInfoLngLat(markerInfo: MarkerInfo): LngLatTuple | null;
    addMarker(lngLat: LngLatTuple, featureData: FeatureData): MarkerData;
    createMarker(lngLat: LngLatTuple): BaseDomMarker<unknown>;
    updateFeatureSource(): void;
    getFeatureGeoJson({ withControlMarker, coordinates, }: {
        withControlMarker: boolean;
        coordinates?: Array<Position>;
    }): GeoJsonLineFeature;
    getFeatureGeoJsonWithType({ withControlMarker, coordinates, }: {
        withControlMarker: boolean;
        coordinates?: Array<Position>;
    }): GeoJsonShapeFeature;
    getShapeCoordinates({ withControlMarker }: {
        withControlMarker: boolean;
    }): Array<LngLatTuple>;
    fireStartEvent(featureData: FeatureData, markerData: MarkerData): void;
    fireUpdateEvent(featureData: FeatureData, markerData: MarkerData): void;
    fireStopEvent(featureGeoJson: GeoJsonLineFeature): void;
}

declare class Geoman {
    mapAdapterInstance: BaseMapAdapter<AnyMapInstance> | null;
    globalLngLatBounds: [LngLatTuple, LngLatTuple];
    features: Features;
    loaded: boolean;
    destroyed: boolean;
    options: GmOptions;
    events: GmEvents;
    control: GMControl;
    actionInstances: {
        [key in ActionInstanceKey]?: ActionInstance;
    };
    markerPointer: MarkerPointer;
    constructor(map: AnyMapInstance, options?: PartialDeep<GmOptionsData>);
    get drawClassMap(): {
        marker: (new (gm: Geoman) => BaseDraw) | null;
        circle: (new (gm: Geoman) => BaseDraw) | null;
        circle_marker: (new (gm: Geoman) => BaseDraw) | null;
        ellipse: (new (gm: Geoman) => BaseDraw) | null;
        text_marker: (new (gm: Geoman) => BaseDraw) | null;
        line: (new (gm: Geoman) => BaseDraw) | null;
        rectangle: (new (gm: Geoman) => BaseDraw) | null;
        polygon: (new (gm: Geoman) => BaseDraw) | null;
        freehand: (new (gm: Geoman) => BaseDraw) | null;
        custom_shape: (new (gm: Geoman) => BaseDraw) | null;
    };
    get editClassMap(): {
        drag: (new (gm: Geoman) => BaseEdit) | null;
        change: (new (gm: Geoman) => BaseEdit) | null;
        rotate: (new (gm: Geoman) => BaseEdit) | null;
        scale: (new (gm: Geoman) => BaseEdit) | null;
        copy: (new (gm: Geoman) => BaseEdit) | null;
        cut: (new (gm: Geoman) => BaseEdit) | null;
        split: (new (gm: Geoman) => BaseEdit) | null;
        union: (new (gm: Geoman) => BaseEdit) | null;
        difference: (new (gm: Geoman) => BaseEdit) | null;
        line_simplification: (new (gm: Geoman) => BaseEdit) | null;
        lasso: (new (gm: Geoman) => BaseEdit) | null;
        delete: (new (gm: Geoman) => BaseEdit) | null;
    };
    get helperClassMap(): {
        shape_markers: (new (gm: Geoman) => BaseHelper) | null;
        pin: (new (gm: Geoman) => BaseHelper) | null;
        snapping: (new (gm: Geoman) => BaseHelper) | null;
        snap_guides: (new (gm: Geoman) => BaseHelper) | null;
        measurements: (new (gm: Geoman) => BaseHelper) | null;
        auto_trace: (new (gm: Geoman) => BaseHelper) | null;
        geofencing: (new (gm: Geoman) => BaseHelper) | null;
        zoom_to_features: (new (gm: Geoman) => BaseHelper) | null;
        click_to_edit: (new (gm: Geoman) => BaseHelper) | null;
    };
    get mapAdapter(): BaseMapAdapter<AnyMapInstance>;
    initCoreOptions(options?: PartialDeep<GmOptionsData>): GmOptions;
    initCoreEvents(): GmEvents;
    initCoreFeatures(): Features;
    initCoreControls(): GMControl;
    initMarkerPointer(): MarkerPointer;
    addControls(controlsElement?: HTMLElement | undefined): Promise<void>;
    waitForBaseMap(): Promise<MapWithOnceMethod | undefined>;
    waitForGeomanLoaded(): Promise<Geoman | undefined>;
    init(): Promise<void>;
    /**
     * Destroys the Geoman instance and cleans up resources.
     *
     * This method can be called at any point in the lifecycle:
     * - Before initialization completes: cancels pending init and cleans up synchronously
     * - After initialization completes: performs full cleanup including controls
     *
     * For React StrictMode compatibility, this method performs synchronous cleanup
     * of the `gm` reference on the map instance, allowing immediate re-initialization.
     */
    destroy({ removeSources }?: {
        removeSources: boolean;
    }): Promise<void>;
    removeControls(): void;
    onMapLoad(): Promise<void>;
    disableAllModes(): void;
    getActiveDrawModes(): Array<DrawModeName>;
    getActiveEditModes(): Array<EditModeName>;
    getActiveHelperModes(): Array<HelperModeName>;
    getGlobalLngLatBounds(): [LngLatTuple, LngLatTuple];
    setGlobalEventsListener(callback?: EventForwarder['globalEventsListener']): void;
    createSvgMarkerElement(type: keyof GmOptions['settings']['markerIcons'], style?: Partial<CSSStyleDeclaration> | undefined): HTMLElement;
    enableMode(actionType: ModeType, modeName: ModeName): void;
    disableMode(actionType: ModeType, modeName: ModeName): void;
    toggleMode(actionType: ModeType, modeName: ModeName): void;
    isModeEnabled(actionType: ModeType, modeName: ModeName): boolean;
    enableDraw(shape: DrawModeName): void;
    disableDraw(): void;
    toggleDraw(shape: DrawModeName): void;
    drawEnabled(shape: DrawModeName): boolean;
    enableGlobalDragMode(): void;
    disableGlobalDragMode(): void;
    toggleGlobalDragMode(): void;
    globalDragModeEnabled(): boolean;
    enableGlobalEditMode(): void;
    disableGlobalEditMode(): void;
    toggleGlobalEditMode(): void;
    globalEditModeEnabled(): boolean;
    enableGlobalRotateMode(): void;
    disableGlobalRotateMode(): void;
    toggleGlobalRotateMode(): void;
    globalRotateModeEnabled(): boolean;
    enableGlobalCutMode(): void;
    disableGlobalCutMode(): void;
    toggleGlobalCutMode(): void;
    globalCutModeEnabled(): boolean;
    enableGlobalRemovalMode(): void;
    disableGlobalRemovalMode(): void;
    toggleGlobalRemovalMode(): void;
    globalRemovalModeEnabled(): boolean;
}
declare const createGeomanInstance: (map: AnyMapInstance, options: PartialDeep<GmOptionsData>) => Promise<Geoman>;

export { BaseAction, BaseDomMarker, BaseDrag, BaseDraw, BaseEdit, BaseGroupEdit, BaseHelper, BaseLayer, BaseMapAdapter, BasePopup, BaseSource, DRAW_MODES, EDIT_MODES, EXTRA_DRAW_MODES, FEATURE_ID_PROPERTY, FEATURE_PROPERTY_PREFIX, FeatureData, GMControl, GM_PREFIX, Geoman, GmOptions, HELPER_MODES, IS_PRO, LineDrawer, MarkerPointer, SHAPE_NAMES, SOURCES, ShapeMarkersHelper, baseMapEventNames, boundsContains, boundsToBBox, calculatePerimeter, controlActions, controlIcons, convertToLineStringFeatureCollection, convertToThrottled, createGeomanInstance, customShapeRectangle, customShapeTriangle, styles as defaultLayerStyles, drawClassMap, eachCoordinateWithPath, eachSegmentWithPath, editClassMap, findCoordinateWithPath, formatArea, formatDistance, geoJsonPointToLngLat, geofencingViolationActions, getEuclideanDistance, getEuclideanSegmentNearestPoint, getGeoJsonCoordinatesCount, getGeoJsonFirstPoint, getLngLatDiff, gmServiceEventNames, helperClassMap, includesWithType, isActionType, isBaseMapEventName, isDrawModeName, isEditModeName, isEqualPosition, isGeoJsonFeatureInPolygon, isGmControlEvent, isGmDrawEvent, isGmDrawFreehandDrawerEvent, isGmDrawLineDrawerEvent, isGmDrawShapeEvent, isGmEditEvent, isGmEvent, isGmFeatureBeforeCreateEvent, isGmFeatureBeforeUpdateEvent, isGmHelperEvent, isGmModeEvent, isHelperModeName, isMapPointerEvent, isMapWithOnceMethod, isModeName, isMultiPolygonFeature, isNonEmptyArray, isPointerEventName, isPolygonFeature, lngLatToGeoJsonPoint, mapInteractions, mergeByTypeCustomizer, modeActions, moveFeatureData, moveGeoJson, pointerEvents, toMod, twoCoordsToLineString, typedKeys };
export type { ActionInstance, ActionInstanceKey, ActionOption, ActionOptions, ActionSetting, ActionSettings, ActionType, AnchorPosition, AnyEventName, AnyMapInstance, BaseControlsPosition, BaseDomMarkerOptions, BaseEventListener$1 as BaseEventListener, BaseFitBoundsOptions, BaseMapEventName, BasePopupOptions, BasicGeometry, CenterMarkerData, ChoiceItem, ControlOptions, ControlSettings, ControlStyles, CoordinateIndices, CursorType, DomMarkerData, DrawModeName, EdgeMarkerData, EditModeName, EventControls, EventFor, EventHandlers, EventLevel, EventsMap, ExtraDrawModeName, FeatureCreatedFwdEvent, FeatureDataParameters, FeatureEditEndFwdEvent, FeatureEditFwdEvent, FeatureEditStartFwdEvent, FeatureFwdEvent, FeatureId, FeatureRemovedFwdEvent, FeatureShape, FeatureShapeProperties, FeatureSourceName, FeatureStore, FeatureUpdatedFwdEvent, ForEachFeatureDataCallbackFn, FwdEditModeName, GenericControlsOptions, GenericSystemControl, GenericSystemControls, GeoJsonFeatureData, GeoJsonImportFeature, GeoJsonImportFeatureCollection, GeoJsonLineFeature, GeoJsonShapeFeature, GeoJsonShapeFeatureCollection, GeoJsonUniversalDiff, GlobalDrawEnabledDisabledFwdEvent, GlobalDrawToggledFwdEvent, GlobalEditToggledFwdEvent, GlobalEventsListener, GlobalHelperToggledFwdEvent, GlobalModeToggledFwdEvent, GmBaseEvent, GmBaseModeEvent, GmControlEvent, GmControlLoadEvent, GmControlSwitchEvent, GmDrawEvent, GmDrawFeatureCreatedEvent, GmDrawFreehandDrawerEvent, GmDrawFreehandDrawerEventWithData, GmDrawLineDrawerEvent, GmDrawLineDrawerEventWithData, GmDrawModeEvent, GmDrawShapeEvent, GmDrawShapeEventWithData, GmEditEvent, GmEditFeatureEditEndEvent, GmEditFeatureEditStartEvent, GmEditFeatureRemovedEvent, GmEditFeatureUpdatedEvent, GmEditMarkerEvent, GmEditMarkerMoveEvent, GmEditModeEvent, GmEvent, GmEventHadler, GmEventHandlersWithControl, GmEventName, GmEventNameWithoutPrefix, GmFeatureBeforeCreateEvent, GmFeatureBeforeUpdateEvent, GmFeatureEvent, GmFwdEventName, GmFwdEventNameWithPrefix, GmFwdSystemEventNameWithPrefix, GmGeofencingViolationEvent, GmHelperEvent, GmHelperModeEvent, GmLoadStateFwdEvent, GmOptionsData, GmOptionsPartial, GmPrefix, GmServiceEventName, GmServiceEventNameWithPrefix, GmSystemEvent, GmSystemPrefix, HelperModeName, HiddenActionOption, ImportGeoJsonOptions, ImportGeoJsonProperties, LayerStyle, LineBasedGeometry, LineEventHandlerArguments, LngLatDiff, LngLatTuple, MapEventHadler, MapEventHandlersWithControl, MapEventName, MapHandlerReturnData, MapInstanceWithGeoman, MapInteraction, MapTypes, MapWithOnceMethod, MarkerData, MarkerId, ModeAction, ModeName, ModeType, NonEmptyArray, PartialCircleLayer, PartialFillLayer, PartialLayerStyle, PartialLineLayer, PartialSymbolLayer, PointBasedGeometry, PointerEventName, PositionData, PrefixedFeatureShapeProperties, ScreenPoint, SegmentPosition, SelectActionOption, ShapeGeoJsonProperties, ShapeName, SourceStyles, SourcesStorage, StyleVariables, SubAction, SubActions, SystemControl, SystemControls, SystemFwdEvent, ToggleActionOption, VertexMarkerData };
