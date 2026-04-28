export declare class CreateClientDto {
    name: string;
    shortName: string;
    industry: string;
    description?: string;
    status?: 'Activo' | 'Pendiente' | 'Sin cuenta';
    connected?: boolean;
    avatarColor?: string;
}
