import { Types } from "bitecs";

type Types = (typeof Types)[keyof typeof Types];

export { Types };
