import { Schema, type } from "@colyseus/schema"

export enum Axis {
	X = "x",
	Y = "y",
	Z = "z",
}

export enum Hint {
	STRING = "string",
	NUMBER = "number"
}

export class Vector extends Schema {
	@type("number") x: number;
	@type("number") y: number;
	@type("number") z: number;

	constructor(x: number, y: number, z: number = 0) {
		super(x, y, z);
		this.x = x;
		this.y = y;
		this.z = z;
	}

	add(vector: Vector | number, y?: number, z?: number): Vector {
		if (typeof vector === "number") {
			this.x += vector;
			this.y += y;
			this.z += z;
		} else {
			this.x += vector.x;
			this.y += vector.y;
			this.z += vector.z;
		}

		return this;
	}

	sub(vector: Vector | number, y?: number, z?: number): Vector {
		if (typeof vector === "number") {
			this.x -= vector;
			this.y -= y;
			this.z -= z;
		} else {
			this.x -= vector.x;
			this.y -= vector.y;
			this.z -= vector.z;
		}

		return this;
	}

	div(vector: Vector | number, y?: number, z?: number): Vector {
		if (typeof vector === "number") {
			this.x /= vector;
			this.y /= y;
			this.z /= z;
		} else {
			this.x /= vector.x;
			this.y /= vector.y;
			this.z /= vector.z;
		}

		return this;
	}

	mult(vector: Vector | number, y?: number, z?: number): Vector {
		if (typeof vector === "number") {
			this.x *= vector;
			this.y *= y;
			this.z *= z;
		} else {
			this.x *= vector.x;
			this.y *= vector.y;
			this.z *= vector.z;
		}

		return this;
	}

	set(vector: Vector | number, y?: number, z?: number): Vector {
		if (typeof vector === "number") {
			this.x = vector;
			this.y = y;
			this.z = z;
		} else {
			this.x = vector.x;
			this.y = vector.y;
			this.z = vector.z;
		}

		return this;
	}

	rotate(angle: number, axis: Axis = Axis.Z): Vector {
		const x = this.x;
		const y = this.y;
		const z = this.z;

		switch (axis) {
			case Axis.X:
				this.y = y * Math.cos(angle) - z * Math.sin(angle);
				this.z = y * Math.sin(angle) + z * Math.cos(angle);
				break;
			case Axis.Y:
				this.x = x * Math.cos(angle) - z * Math.sin(angle);
				this.z = x * Math.sin(angle) + z * Math.cos(angle);
				break;
			case Axis.Z:
				this.x = x * Math.cos(angle) - y * Math.sin(angle);
				this.y = x * Math.sin(angle) + y * Math.cos(angle);
				break;
		}

		return this;
	}

	normalize(): Vector {
		this["/="](this.mag);

		return this;
	}

	reflect(vector: Vector): Vector {
		const sub = (vector).mult(this.dot(vector));
		this["-="](sub);
		this["*="](-1);
		this["+="](sub);

		return this;
	}

	get magSq(): number {
		return this.dot(this);
	}

	get mag(): number {
		return Math.sqrt(this.magSq);
	}

	get normalized(): Vector {
		return this.copy.normalize();
	}

	get copy(): Vector {
		return new Vector(this.x, this.y, this.z);
	}

	get heading(): number {
		return Math.atan2(this.y, this.x);
	}

	get abs(): Vector {
		return new Vector(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z));
	}

	get angle(): number {
		return Math.atan2(this.y, this.x);
	}

	max(vector: Vector): Vector {
		return new Vector(Math.max(this.x, vector.x), Math.max(this.y, vector.y), Math.max(this.z, vector.z));
	}

	min(vector: Vector): Vector {
		return new Vector(Math.min(this.x, vector.x), Math.min(this.y, vector.y), Math.min(this.z, vector.z));
	}

	dot(vector: Vector): number {
		return this.x * vector.x + this.y * vector.y + this.z * vector.z;
	}

	lerp(vector: Vector, amount: number): Vector {
		return this.mult(1 - amount).add(vector.copy.mult(amount));
	}

	get xy(): Vector {
		return new Vector(this.x, this.y);
	}

	get xz(): Vector {
		return new Vector(this.x, this.z);
	}

	get yz(): Vector {
		return new Vector(this.y, this.z);
	}

	set xy(vector: Vector) {
		this.x = vector.x;
		this.y = vector.y;
	}

	set xz(vector: Vector) {
		this.x = vector.x;
		this.z = vector.z;
	}

	set yz(vector: Vector) {
		this.y = vector.y;
		this.z = vector.z;
	}

	set mag(mag: number) {
		this.mult(mag / this.mag);
	}

	set heading(angle: number) {
		this.rotate(angle - this.heading);
	}

	static add(vector1: Vector, vector2: Vector): Vector {
		return vector1.copy.add(vector2);
	}

	static sub(vector1: Vector, vector2: Vector): Vector {
		return vector1.copy.sub(vector2);
	}

	static mult(vector1: Vector, vector2: Vector): Vector {
		return vector1.copy.mult(vector2);
	}

	static div(vector1: Vector, vector2: Vector): Vector {
		return vector1.copy.div(vector2);
	}

	static rotate(vector: Vector, angle: number, axis: Axis = Axis.Z): Vector {
		return vector.copy.rotate(angle, axis);
	}

	static dot(vector1: Vector, vector2: Vector): number {
		return vector1.dot(vector2);
	}

	static lerp(vector1: Vector, vector2: Vector, amount: number): Vector {
		return vector1.copy.lerp(vector2, amount);
	}

	static normalize(vector: Vector): Vector {
		return vector.normalized;
	}

	static get zero(): Vector {
		return new Vector(0, 0, 0);
	}

	"+="(vector: Vector | number, y?: number, z?: number): Vector {
		if (typeof vector === "number") {
			return this.add(vector, y, z);
		} else {
			return this.add(vector);
		}
	}

	"-="(vector: Vector | number, y?: number, z?: number): Vector {
		if (typeof vector === "number") {
			return this.sub(vector, y, z);
		} else {
			return this.sub(vector);
		}
	}

	"*="(vector: Vector | number, y?: number, z?: number): Vector {
		if (typeof vector === "number") {
			return this.mult(vector, y, z);
		} else {
			return this.mult(vector);
		}
	}

	"/="(vector: Vector | number, y?: number, z?: number): Vector {
		if (typeof vector === "number") {
			return this.div(vector, y, z);
		} else {
			return this.div(vector);
		}
	}

	"=" (vector: Vector | number, y?: number, z?: number): Vector {
		if (typeof vector === "number") {
			return this.set(vector, y, z);
		} else {
			return this.set(vector);
		}
	}

	"+"(vector: Vector): Vector {
		return this.add(vector);
	}

	"-"(vector: Vector): Vector {
		return this.sub(vector);
	}

	"*"(vector: Vector): Vector {
		return this.mult(vector);
	}

	"/"(vector: Vector): Vector {
		return this.div(vector);
	}

	"%"(vector: Vector): Vector {
		return new Vector(this.x % vector.x, this.y % vector.y, this.z % vector.z);
	}

	"=="(vector: Vector): boolean {
		return this.x === vector.x && this.y === vector.y && this.z === vector.z;
	}

	[Symbol.toPrimitive](hint: Hint) {
		switch (hint) {
			case "string":
				return this.toString();
			case "number":
			default:
				return this.toNumber();
		}
	}

	toString(): string {
		return this.z == 0 ? `(${this.x}, ${this.y})` : `(${this.x}, ${this.y}, ${this.z})`;
	}

	toNumber(): number {
		return this.mag;
	}
}