// Copyright 2022-2023 the Chili authors. All rights reserved. MPL-2.0 license.

import { CurveType, ICircle, ICurve, IDisposable, ILine, XYZ } from "chili-core";
import { Geom_Circle, Geom_Curve, Geom_Line, Geom_TrimmedCurve } from "opencascade.js";

import { OccHelps } from "./occHelps";

export class OccCurve implements ICurve, IDisposable {
    readonly curve: Geom_TrimmedCurve;
    readonly curveType: CurveType;

    constructor(curve: Geom_Curve, start: number, end: number) {
        let curveHandle = new occ.Handle_Geom_Curve_2(curve);
        this.curveType = OccHelps.getCurveType(curve);
        this.curve = new occ.Geom_TrimmedCurve(curveHandle, start, end, true, true);
    }

    point(parameter: number): XYZ {
        let p = this.curve.Value(parameter);
        return OccHelps.toXYZ(p);
    }

    firstParameter() {
        return this.curve.FirstParameter();
    }

    lastParameter() {
        return this.curve.LastParameter();
    }

    trim(start: number, end: number) {
        this.curve.SetTrim(start, end, true, true);
    }

    project(point: XYZ): XYZ[] {
        let result = new Array<XYZ>();
        let api = new occ.GeomAPI_ProjectPointOnCurve_3(
            OccHelps.toPnt(point),
            this.curve.BasisCurve(),
            this.firstParameter(),
            this.lastParameter()
        );
        for (let i = 1; i <= api.NbPoints(); i++) {
            let point = api.Point(i);
            result.push(OccHelps.toXYZ(point));
        }
        result.sort((a, b) => a.distanceTo(point) - b.distanceTo(point));
        return result;
    }

    dispose() {
        this.curve.delete();
    }
}

export class OccLine extends OccCurve implements ILine {
    constructor(private line: Geom_Line, start: number, end: number) {
        super(line, start, end);
    }

    get start(): XYZ {
        return OccHelps.toXYZ(this.curve.StartPoint());
    }

    get endPoint(): XYZ {
        return OccHelps.toXYZ(this.curve.EndPoint());
    }

    get direction(): XYZ {
        return OccHelps.toXYZ(this.lin().Direction());
    }

    set direction(value: XYZ) {
        this.line.SetDirection(OccHelps.toDir(value));
    }

    get location(): XYZ {
        return OccHelps.toXYZ(this.lin().Location());
    }

    set location(value: XYZ) {
        this.line.SetLocation(OccHelps.toPnt(value));
    }

    private lin() {
        return this.line.Lin();
    }
}

export class OccCircle extends OccCurve implements ICircle {
    constructor(private circle: Geom_Circle, start: number, end: number) {
        super(circle, start, end);
    }

    get center(): XYZ {
        return OccHelps.toXYZ(this.circle.Location());
    }

    set center(value: XYZ) {
        this.circle.SetLocation(OccHelps.toPnt(value));
    }

    get radius(): number {
        return this.circle.Radius();
    }

    set radius(value: number) {
        this.circle.SetRadius(value);
    }
}
