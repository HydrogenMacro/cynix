import { Container } from "pixi.js";

export abstract class Entity {
    abstract display: Container;
    abstract area: Shape 
}