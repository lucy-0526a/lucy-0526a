// Copyright 2022-2023 the Chili authors. All rights reserved. MPL-2.0 license.

import { Color } from "../base";
import { Config } from "../config";
import { XYZ } from "../math";
import { LineType } from "./lineType";
import { IShape } from "./shape";

export interface IShapeMeshData {
    get shape(): IShape;
    get edges(): EdgeMeshData | undefined;
    get faces(): FaceMeshData | undefined;
}

export interface ShapeMeshGroup {
    start: number;
    count: number;
    shape: IShape;
}

export interface ShapeMeshData {
    positions: number[];
    groups: ShapeMeshGroup[];
    color: Color | number[];
}

export namespace ShapeMeshData {
    export function isVertex(data: ShapeMeshData): data is VertexMeshData {
        return (data as VertexMeshData).size !== undefined;
    }

    export function isEdge(data: ShapeMeshData): data is EdgeMeshData {
        return (data as EdgeMeshData).lineType !== undefined;
    }

    export function isFace(data: ShapeMeshData): data is FaceMeshData {
        return (data as FaceMeshData).indices !== undefined;
    }
}

export interface VertexMeshData extends ShapeMeshData {
    size: number;
}

export namespace VertexMeshData {
    export function from(point: XYZ, size: number, color: Color): VertexMeshData {
        return {
            positions: [point.x, point.y, point.z],
            groups: [],
            color,
            size,
        };
    }
}

export interface EdgeMeshData extends ShapeMeshData {
    lineType: LineType;
}

export namespace EdgeMeshData {
    export function from(start: XYZ, end: XYZ, color: Color, lineType: LineType): EdgeMeshData {
        return {
            positions: [start.x, start.y, start.z, end.x, end.y, end.z],
            color,
            lineType,
            groups: [],
        };
    }
}

export interface FaceMeshData extends ShapeMeshData {
    indices: number[];
    normals: number[];
    uvs: number[];
}

export abstract class MeshDataBuilder<T extends ShapeMeshData> {
    protected readonly _positions: number[] = [];
    protected readonly _groups: ShapeMeshGroup[] = [];
    protected _color: Color | undefined;
    protected _vertexColor: number[] | undefined;

    setColor(color: Color) {
        this._color = color;
    }

    addColor(r: number, g: number, b: number) {
        if (this._vertexColor === undefined) this._vertexColor = [];
        this._vertexColor.push(r, g, b);
        return this;
    }

    protected getColor() {
        let color: Color | number[] | undefined = this._vertexColor;
        if (this._vertexColor?.length !== this._positions.length) {
            color = this._color;
        }
        return color;
    }

    abstract newGroup(): this;

    abstract endGroup(shape: IShape): this;

    abstract addPosition(x: number, y: number, z: number): this;

    abstract build(): T;
}

/**
 * LineSegments
 */
export class EdgeMeshDataBuilder extends MeshDataBuilder<EdgeMeshData> {
    protected _positionStart: number = 0;
    private _previousVertex: [number, number, number] | undefined = undefined;
    private _lineType: LineType = LineType.Solid;

    constructor() {
        super();
        this._color = Config.instance.visual.faceEdgeColor;
    }

    setType(type: LineType) {
        this._lineType = type;
    }

    override newGroup() {
        this._positionStart = this._positions.length;
        this._previousVertex = undefined;
        return this;
    }

    override endGroup(shape: IShape) {
        this._groups.push({
            start: this._positionStart / 3,
            count: (this._positions.length - this._positionStart) / 3,
            shape,
        });
        return this;
    }

    override addPosition(x: number, y: number, z: number) {
        if (this._previousVertex) {
            this._positions.push(...this._previousVertex, x, y, z);
        }
        this._previousVertex = [x, y, z];
        return this;
    }

    override build(): EdgeMeshData {
        let color = this.getColor()!;
        return {
            positions: this._positions,
            groups: this._groups,
            lineType: this._lineType,
            color,
        };
    }
}

export class FaceMeshDataBuilder extends MeshDataBuilder<FaceMeshData> {
    private _indexStart: number = 0;
    private _groupStart: number = 0;
    private readonly _normals: number[] = [];
    private readonly _uvs: number[] = [];
    private readonly _indices: number[] = [];

    constructor() {
        super();
        this._color = Color.random();
    }

    override newGroup() {
        this._groupStart = this._indices.length;
        this._indexStart = this._positions.length / 3;
        return this;
    }

    override endGroup(shape: IShape) {
        this._groups.push({
            start: this._groupStart,
            count: this._indices.length - this._groupStart,
            shape,
        });
        return this;
    }

    override addPosition(x: number, y: number, z: number) {
        this._positions.push(x, y, z);
        return this;
    }

    addNormal(x: number, y: number, z: number) {
        this._normals.push(x, y, z);
        return this;
    }

    addUV(u: number, v: number) {
        this._uvs.push(u, v);
        return this;
    }

    addIndices(i1: number, i2: number, i3: number) {
        this._indices.push(this._indexStart + i1, this._indexStart + i2, this._indexStart + i3);
        return this;
    }

    build(): FaceMeshData {
        let color = this.getColor()!;
        return {
            positions: this._positions,
            color,
            normals: this._normals,
            indices: this._indices,
            uvs: this._uvs,
            groups: this._groups,
        };
    }
}
