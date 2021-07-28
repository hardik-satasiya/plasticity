import * as THREE from "three";
import { CircleFactory } from "../../src/commands/circle/CircleFactory";
import ContourManager from "../../src/commands/ContourManager";
import TrimFactory from "../../src/commands/curve/TrimFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/editor/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;
let contours: ContourManager;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    contours = new ContourManager(db, signals);
})

let circle1: visual.SpaceInstance<visual.Curve3D>;
let circle2: visual.SpaceInstance<visual.Curve3D>;

beforeEach(async () => {
    const makeCircle1 = new CircleFactory(db, materials, signals);
    const makeCircle2 = new CircleFactory(db, materials, signals);

    await contours.transaction(async () => {
        makeCircle1.center = new THREE.Vector3(0, 0.25, 0);
        makeCircle1.radius = 1;
        circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;

        makeCircle2.center = new THREE.Vector3(0, -0.25, 0);
        makeCircle2.radius = 1;
        circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;
    });
});


describe(TrimFactory, () => {
    let trim: TrimFactory;

    beforeEach(() => {
        trim = new TrimFactory(db, materials, signals);
    });

    test("it works", async () => {
        expect(db.find(visual.PlaneInstance).length).toBe(1);
        expect(db.find(visual.SpaceInstance).length).toBe(6);
        const { fragments } = contours.lookup(circle1);
        const fragment = await fragments[0] as visual.SpaceInstance<visual.Curve3D>;
        trim.fragment = fragment;
        await contours.transaction(async () => {
            await trim.commit();
        });
        expect(db.find(visual.SpaceInstance).length).toBe(5);
        expect(db.find(visual.PlaneInstance).length).toBe(1);
    })
});
