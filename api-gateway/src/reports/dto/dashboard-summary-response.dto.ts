import { ApiProperty } from "@nestjs/swagger";

export class DashboardSummaryResponseDto {
    @ApiProperty({ example: 10 })
    total_appointments: number;

    @ApiProperty({ example: 2 })
    scheduled: number;

    @ApiProperty({ example: 3 })
    confirmed: number;

    @ApiProperty({ example: 6 })
    completed: number;

    @ApiProperty({ example: 1 })
    cancelled: number;

    @ApiProperty({ example: 0})
    no_show: number;

    @ApiProperty({ example: 30})
    completion_rate: number;
}