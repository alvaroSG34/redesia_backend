export declare class ClientsQueryDto {
    search?: string;
    status?: 'Todos' | 'Activos' | 'Pendientes' | 'Sin cuenta';
    page?: number;
    pageSize?: number;
}
