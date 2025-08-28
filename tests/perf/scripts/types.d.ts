interface Token {
    token: string;
}

type Data = {
    resources: number[]
} & Token

type Shape = 'tag' | 'cuboid' | 'ellipse' | 'mask' | 'points' | 'polygon' | 'rectangle' | 'skeleton'
type LabelType = Shape | 'any'

interface Label {
    name: string,
    attributes: [] | any[],
    type: LabelType
}

interface IRawData {
    id: string | number
}

interface ProjectSpec {
    name: string,
    labels: Label[],
}