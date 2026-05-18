import { ApiProperty } from "@nestjs/swagger";

export class AppointmentStatusItemDto {
    @ApiProperty({ example: 'completed' })
    status: string;

    @ApiProperty({ example: 5 })
    total: number;
}

export class AppointmentStatusReportResponseDto  {
    @ApiProperty({ type: [AppointmentStatusItemDto] })
    data: AppointmentStatusItemDto[];
}