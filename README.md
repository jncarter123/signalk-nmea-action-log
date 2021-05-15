# signalk-nmea-action-log
This plugin is designed to create a log entry for actions taken on the NMEA network. In my network I have Maretron N2kView and the CKM12 switch panel. Anytime a switch state is changed on the NMEA network a log entry will be created, similar to the following.

```
May 14 23:24:44 NMEA Action Log: Source: 40, Product Name: IPG100, Destination: 145, PGN: 126208, Instance: 26, Switch: 12, State: On

May 14 23:24:59 NMEA Action Log: Source: 40, Product Name: IPG100, Destination: 145, PGN: 126208, Instance: 26, Switch: 12, State: Off

May 14 23:26:46 NMEA Action Log: Source: 40, Product Name: IPG100, Destination: 73, PGN: 126208, Instance: 20, Switch: 5, State: Off

May 14 23:27:04 NMEA Action Log: Source: 40, Product Name: IPG100, Destination: 73, PGN: 126208, Instance: 20, Switch: 5, State: On

May 14 23:34:55 NMEA Action Log: Source: 100, Product Name: CKM12, Destination: 255, PGN: 127501, Instance: 30, Switch: Indicator4, State: On

May 14 23:35:14 NMEA Action Log: Source: 100, Product Name: CKM12, Destination: 255, PGN: 127501, Instance: 30, Switch: Indicator4, State: On

May 14 23:37:37 NMEA Action Log: Source: 40, Product Name: IPG100, Destination: 146, PGN: 126208, Instance: 24, Switch: 9, State: On

May 14 23:37:37 NMEA Action Log: Source: 40, Product Name: IPG100, Destination: 146, PGN: 126208, Instance: 24, Switch: 8, State: Off

May 14 23:37:44 NMEA Action Log: Source: 40, Product Name: IPG100, Destination: 146, PGN: 126208, Instance: 24, Switch: 8, State: Off

May 14 23:37:44 NMEA Action Log: Source: 40, Product Name: IPG100, Destination: 146, PGN: 126208, Instance: 24, Switch: 9, State: Off
```

The source, destination, PGN, device instance, switch, and state are all logged so that you will know what was changed, when it was changed, and how it was changed.

## Plugin Configuration
The plugin configuration is straightforward. You can enable logging for each type of control message by checking the enable box. If you wish to log control of something like the Maretron CKM12 which uses the 127501 Binary Status PGN, then you must provide the device instance number of the device. This is to ensure that only relevant change commands are logged and the typical noise of the 127501 PGN is ignored.
