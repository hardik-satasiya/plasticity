import { TemporaryObject } from "../../editor/GeometryDatabase";
import * as THREE from "three";
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import c3d from '../../../build/Release/c3d.node';
import { GeometryFactory } from '../Factory';

export default class CurveFactory extends GeometryFactory {
    readonly points = new Array<THREE.Vector3>();
    type = c3d.SpaceType.Hermit3D;
    closed = false;

    nextPoint?: THREE.Vector3;
    private temp?: TemporaryObject;

    get startPoint() { return this.points[0] }

    async doUpdate() {
        const { points, nextPoint, type } = this;

        let length = points.length;
        if (nextPoint !== undefined) length++;

        const vertices = new Float32Array(length * 3);
        for (const [i, point] of points.entries()) {
            vertices[i * 3] = point.x;
            vertices[i * 3 + 1] = point.y;
            vertices[i * 3 + 2] = point.z;
        }
        const last = length - 1;
        if (nextPoint !== undefined) {
            vertices[last * 3] = nextPoint.x;
            vertices[last * 3 + 1] = nextPoint.y;
            vertices[last * 3 + 2] = nextPoint.z;
        }

        const geometry = new LineGeometry();
        geometry.setPositions(vertices);

        if (this.points.length === 0) return;

        let temp;
        try {
            const cartPoints = points.map(p => new c3d.CartPoint3D(p.x, p.y, p.z));
            if (nextPoint !== undefined) cartPoints.push(new c3d.CartPoint3D(nextPoint.x, nextPoint.y, nextPoint.z));
            const curve = c3d.ActionCurve3D.SplineCurve(cartPoints, this.closed, type);
            temp = await this.db.addTemporaryItem(new c3d.SpaceInstance(curve));
        } catch (e) {
            console.log(e);
        }
        this.temp?.cancel();
        this.temp = temp;
    }

    get isValid() {
        if (this.points.length === 0) return false;
        if (this.points.length === 1 && this.nextPoint === undefined) return false;
        return true;
    }

    wouldBeClosed(p: THREE.Vector3) {
        return this.points.length >= 2 && p.distanceToSquared(this.startPoint) < 10e-6;
    }

    async doCommit() {
        const { points, type } = this;
        this.temp?.cancel();

        const cartPoints = points.map(p => new c3d.CartPoint3D(p.x, p.y, p.z));
        const curve = c3d.ActionCurve3D.SplineCurve(cartPoints, this.closed, type);
        return this.db.addItem(new c3d.SpaceInstance(curve));
    }

    doCancel() {
        this.temp?.cancel();
    }
}