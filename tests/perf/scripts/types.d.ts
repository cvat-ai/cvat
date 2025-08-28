interface Data {
    token: string,
    resources: number[]
}

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