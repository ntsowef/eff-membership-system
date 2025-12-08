import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  ImageRun,
  VerticalAlign,
  PageNumber,
  NumberFormat,
  Footer,
  PageOrientation
} from 'docx';
import * as fs from 'fs';
import * as path from 'path';

interface WardInfo {
  ward_code: string;
  ward_name: string;
  ward_number: string;
  municipality_code: string;
  municipality_name: string;
  district_code: string;
  district_name: string;
  province_code: string;
  province_name: string;
}

interface MemberData {
  member_id: number;
  membership_number: string;
  id_number: string;
  firstname: string;
  surname: string;
  full_name: string;
  date_of_birth: string;
  age: number;
  gender_name: string;
  cell_number: string;
  email: string;
  residential_address: string;
  voting_district_code: string;
  voting_district_name: string;
  voting_station_name: string;
  ward_code: string;
  ward_name: string;
  municipality_name: string;
  district_name: string;
  province_name: string;
  date_joined: string;
  expiry_date: string;
  membership_status: string;
}

export class WordDocumentService {
  /**
   * Generate Ward Attendance Register in Word format
   */
  static async generateWardAttendanceRegister(
    wardInfo: WardInfo,
    members: MemberData[]
  ): Promise<Buffer> {
    try {
      console.log('🔄 Starting Word Attendance Register generation...');

      // Group members by voting district (using voting_district_name as the station name)
      const membersByStation = members.reduce((acc, member) => {
        // Use voting_district_name as the station name (this is what appears in the reference doc)
        let stationName = member.voting_district_name || 'Not Registered to vote';
        let vdCode = member.voting_district_code || '999999999';

        // Check if member is registered in a different ward
        if (member.voting_district_code && member.voting_district_code !== '33333333' && member.voting_district_code !== '999999999') {
          // Check if this VD belongs to the current ward
          // If not, it should be in "Registered in different Ward" section
          // For now, we'll use the actual VD name if available
          if (!stationName || stationName === 'Not Registered to vote') {
            stationName = 'Registered in different Ward';
            vdCode = '222222222';
          }
        } else if (member.voting_district_code === '222222222') {
          stationName = 'Registered in different Ward';
          vdCode = '222222222';
        } else if (!member.voting_district_code || member.voting_district_code === '999999999') {
          stationName = 'Not Registered to vote';
          vdCode = '999999999';
        }

        const key = `${stationName}|||${vdCode}`; // Use delimiter to store both
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(member);
        return acc;
      }, {} as Record<string, MemberData[]>);

      // Sort stations with custom order: proper VDs first (alphabetically), then "Registered in different Ward", then "Not Registered to vote"
      const sortedStations = Object.keys(membersByStation).sort((a, b) => {
        const [nameA, codeA] = a.split('|||');
        const [nameB, codeB] = b.split('|||');

        // "Not Registered to vote" always goes last
        if (codeA === '999999999') return 1;
        if (codeB === '999999999') return -1;

        // "Registered in different Ward" goes second to last
        if (codeA === '222222222') return 1;
        if (codeB === '222222222') return -1;

        // All other VDs sorted alphabetically by name
        return nameA.localeCompare(nameB);
      });

      // Load EFF logo from backend assets directory
      // __dirname in compiled code points to: backend/dist/services/
      // Go up one level to dist/, then into assets/images/
      const logoPath = path.join(__dirname, '..', 'assets', 'images', 'EFF_Reglogo.png');

      let logoImage: ImageRun | null = null;

      if (fs.existsSync(logoPath)) {
        console.log(`✅ EFF logo found at: ${logoPath}`);
        const imageBuffer = fs.readFileSync(logoPath);
        logoImage = new ImageRun({
          data: imageBuffer,
          type: 'png',
          transformation: {
            width: 100,
            height: 100
          }
        });
      } else {
        console.warn(`⚠️  EFF logo not found at: ${logoPath}`);
        console.warn('   Attendance register will be generated without logo');
        console.warn(`   __dirname is: ${__dirname}`);
        console.warn(`   Tried path: ${logoPath}`);
      }

      // Calculate statistics
      const totalMembers = members.length;
      const quorum = Math.floor(totalMembers / 2) + 1;
      const totalVotingStations = sortedStations.length;

      // Create document sections
      const sections = [];

      // Header section with title and logo
      const headerParagraphs: Paragraph[] = [];

      // Title
      headerParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'FORM A: ATTENDANCE REGISTER',
              bold: true,
              size: 28
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        })
      );

      // Add bold horizontal line under title
      headerParagraphs.push(
        new Paragraph({
          border: {
            bottom: {
              color: '000000',
              space: 1,
              style: BorderStyle.SINGLE,
              size: 24 // Bold line
            }
          },
          spacing: { after: 200 }
        })
      );

      // Logo (centered)
      if (logoImage) {
        headerParagraphs.push(
          new Paragraph({
            children: [logoImage],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 }
          })
        );
      }

      // Two-column header information table
      const wardInfoTable = new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE
              },
              borders: {
                top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
              },
              rows: [
                // Row 1
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      borders: {
                        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                      },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `PROVINCE: ${wardInfo.province_name}`,
                              bold: true,
                              size: 20
                            })
                          ]
                        })
                      ]
                    }),
                    new TableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      borders: {
                        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                      },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `SUB REGION: ${wardInfo.municipality_code} - ${wardInfo.municipality_name}`,
                              bold: true,
                              size: 20
                            })
                          ]
                        })
                      ]
                    })
                  ]
                }),
                // Row 2
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      borders: {
                        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                      },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `TOTAL MEMBERSHIP IN GOOD STANDING: ${totalMembers}`,
                              size: 20
                            })
                          ]
                        })
                      ]
                    }),
                    new TableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      borders: {
                        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                      },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `WARD: ${wardInfo.ward_code}`,
                              bold: true,
                              size: 20
                            })
                          ]
                        })
                      ]
                    })
                  ]
                }),
                // Row 3
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      borders: {
                        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                      },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `QUORUM: ${quorum}`,
                              size: 20
                            })
                          ]
                        })
                      ]
                    }),
                    new TableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      borders: {
                        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                      },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: 'BPA: |_|  BGA: |_|',
                              size: 20
                            })
                          ]
                        })
                      ]
                    })
                  ]
                }),
                // Row 4
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      borders: {
                        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                      },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: 'DATE OF BPA/BGA: _________________',
                              size: 20
                            })
                          ]
                        })
                      ]
                    }),
                    new TableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      borders: {
                        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                      },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `TOTAL NUMBER OF VOTING STATIONS: ${totalVotingStations}`,
                              size: 20
                            })
                          ]
                        })
                      ]
                    })
                  ]
                })
              ]
      });

      // Create attendance tables grouped by voting station
      const attendanceTables: (Paragraph | Table)[] = [];
      let globalMemberNumber = 1;

      sortedStations.forEach((stationKey, stationIndex) => {
        // Extract station name and VD code from key
        const [stationName, vdCode] = stationKey.split('|||');
        const stationMembers = membersByStation[stationKey];

        // Add voting station header with VD number
        attendanceTables.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Voting Station: ${stationName} (VD Number: ${vdCode})`,
                bold: true,
                size: 22
              })
            ],
            spacing: { before: stationIndex === 0 ? 0 : 400, after: 200 }
          })
        );

        // Create table for this voting station
        const tableRows: TableRow[] = [];

        // Header row with grey background (matching reference document format)
        tableRows.push(
          new TableRow({
            children: [
              this.createHeaderCell('NUM', 600),
              this.createHeaderCell('NAME', 2500),
              this.createHeaderCell('WARD NUMBER', 1200),
              this.createHeaderCell('ID NUMBER', 1800),
              this.createHeaderCell('CELL NUMBER', 1500),
              this.createHeaderCell('REGISTERED VD', 2000),
              this.createHeaderCell('SIGNATURE', 1500),
              this.createHeaderCell('NEW CELL NUM', 1500)
            ],
            tableHeader: true
          })
        );

        // Data rows for this station
        stationMembers.forEach((member) => {
          // Determine what to show in "REGISTERED VD" column
          let registeredVD = '';
          if (member.voting_district_code === '999999999' || !member.voting_district_code) {
            registeredVD = 'Not Registered';
          } else if (member.voting_district_code === '222222222') {
            registeredVD = 'Different Ward';
          } else {
            // Show the actual voting district name
            registeredVD = member.voting_district_name || member.voting_district_code;
          }

          tableRows.push(
            new TableRow({
              children: [
                this.createDataCell(globalMemberNumber.toString(), 600),
                this.createDataCell(member.full_name, 2500),
                this.createDataCell(wardInfo.ward_code, 1200),
                this.createDataCell(member.id_number, 1800),
                this.createDataCell(member.cell_number, 1500),
                this.createDataCell(registeredVD, 2000),
                this.createDataCell('', 1500), // Empty cell for signature
                this.createDataCell('', 1500)  // Empty cell for new cell number
              ]
            })
          );
          globalMemberNumber++;
        });

        // Add station total row with yellow background (matching reference format)
        tableRows.push(
          new TableRow({
            children: [
              this.createTotalCell('', 600),
              this.createTotalCell(`Total Voters in ${stationName}: ${stationMembers.length}`, 2500, true),
              this.createTotalCell('', 1200),
              this.createTotalCell('', 1800),
              this.createTotalCell('', 1500),
              this.createTotalCell('', 2000),
              this.createTotalCell('', 1500),
              this.createTotalCell('', 1500)
            ]
          })
        );

        const districtTable = new Table({
          rows: tableRows,
          width: {
            size: 100,
            type: WidthType.PERCENTAGE
          }
        });

        attendanceTables.push(districtTable);
      });

      // Grand total section
      const grandTotalParagraphs: Paragraph[] = [
        new Paragraph({
          children: [new TextRun({ text: '' })],
          spacing: { before: 400 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `GRAND TOTAL: ${members.length} MEMBERS`,
              bold: true,
              size: 28,
              color: 'DC143C' // EFF red
            })
          ],
          spacing: { after: 200 },
          alignment: AlignmentType.CENTER
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Number of Voting Stations: ${sortedStations.length}`,
              bold: true,
              size: 22
            })
          ],
          spacing: { after: 300 },
          alignment: AlignmentType.CENTER
        })
      ];

      // Footer section
      const footerParagraphs: Paragraph[] = [
        new Paragraph({
          children: [new TextRun({ text: '' })],
          spacing: { before: 400 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '___________________________',
              size: 20
            })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Presiding Officer Signature',
              bold: true,
              size: 20
            })
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Date: _______________',
              size: 20
            })
          ]
        })
      ];

      // Create the document with page numbers and landscape orientation
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 720,
                  right: 720,
                  bottom: 720,
                  left: 720
                },
                pageNumbers: {
                  start: 1,
                  formatType: NumberFormat.DECIMAL
                },
                size: {
                  orientation: PageOrientation.LANDSCAPE
                }
              }
            },
            footers: {
              default: new Footer({
                children: [
                  // Footer with three sections: left (sub-region), center (page numbers), right (ward code)
                  new Table({
                    width: {
                      size: 100,
                      type: WidthType.PERCENTAGE
                    },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                    },
                    rows: [
                      new TableRow({
                        children: [
                          // Left: Sub-Region
                          new TableCell({
                            width: {
                              size: 33,
                              type: WidthType.PERCENTAGE
                            },
                            borders: {
                              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                            },
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({
                                    text: `${wardInfo.municipality_name} Sub-Region`,
                                    size: 18
                                  })
                                ],
                                alignment: AlignmentType.LEFT
                              })
                            ]
                          }),
                          // Center: Page Numbers
                          new TableCell({
                            width: {
                              size: 34,
                              type: WidthType.PERCENTAGE
                            },
                            borders: {
                              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                            },
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({
                                    children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES],
                                    size: 18
                                  })
                                ],
                                alignment: AlignmentType.CENTER
                              })
                            ]
                          }),
                          // Right: Ward Code
                          new TableCell({
                            width: {
                              size: 33,
                              type: WidthType.PERCENTAGE
                            },
                            borders: {
                              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                            },
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({
                                    text: `WARD: ${wardInfo.ward_code}`,
                                    size: 18
                                  })
                                ],
                                alignment: AlignmentType.RIGHT
                              })
                            ]
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            },
            children: [
              ...headerParagraphs,
              wardInfoTable,
              new Paragraph({ text: '', spacing: { after: 400 } }), // Spacing after table
              ...attendanceTables,
              ...grandTotalParagraphs,
              ...footerParagraphs
            ]
          }
        ]
      });

      // Generate buffer
      const buffer = await Packer.toBuffer(doc);
      console.log('✅ Word Attendance Register generated successfully');
      return buffer;

    } catch (error: any) {
      console.error('❌ Failed to generate Word Attendance Register:', error);
      throw new Error(`Failed to generate Word document: ${error.message}`);
    }
  }

  /**
   * Create header cell with grey background styling
   */
  private static createHeaderCell(text: string | null | undefined, width?: number): TableCell {
    // Handle null/undefined values by converting to empty string
    const safeText = text != null ? String(text) : '';

    return new TableCell({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: safeText,
              bold: true,
              color: '000000', // Black text
              size: 20
            })
          ],
          alignment: AlignmentType.CENTER
        })
      ],
      shading: {
        fill: 'D3D3D3' // Grey background
      },
      width: width ? {
        size: width,
        type: WidthType.DXA
      } : undefined,
      verticalAlign: VerticalAlign.CENTER
    });
  }

  /**
   * Create data cell with styling
   */
  private static createDataCell(text: string | null | undefined, width?: number, bold: boolean = false): TableCell {
    // Handle null/undefined values by converting to empty string
    const safeText = text != null ? String(text) : '';

    return new TableCell({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: safeText,
              size: 18,
              bold: bold
            })
          ]
        })
      ],
      width: width ? {
        size: width,
        type: WidthType.DXA
      } : undefined,
      verticalAlign: VerticalAlign.CENTER
    });
  }

  /**
   * Create total cell with yellow background styling
   */
  private static createTotalCell(text: string | null | undefined, width?: number, bold: boolean = false): TableCell {
    // Handle null/undefined values by converting to empty string
    const safeText = text != null ? String(text) : '';

    return new TableCell({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: safeText,
              size: 18,
              bold: bold
            })
          ]
        })
      ],
      shading: {
        fill: 'FFFF00' // Yellow background
      },
      width: width ? {
        size: width,
        type: WidthType.DXA
      } : undefined,
      verticalAlign: VerticalAlign.CENTER
    });
  }
}

